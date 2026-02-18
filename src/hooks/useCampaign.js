import { useState, useEffect, useCallback, useRef } from 'react';
import * as db from '../lib/db';

/**
 * Hook to manage campaign list for the home screen.
 * Replaces useStorage('dm-hud-campaigns', [])
 */
export function useCampaigns(userId) {
  const [campaigns, setCampaigns] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    db.fetchCampaigns(userId).then(data => {
      if (!cancelled) {
        setCampaigns(data);
        setLoaded(true);
      }
    }).catch(err => {
      console.error('Failed to load campaigns:', err);
      if (!cancelled) setLoaded(true);
    });

    return () => { cancelled = true; };
  }, [userId]);

  const create = useCallback(async (name) => {
    const { campaign, session } = await db.createCampaign(userId, name);
    // Attach the session for immediate use
    campaign._firstSession = session;
    setCampaigns(prev => [campaign, ...prev]);
    return campaign;
  }, [userId]);

  const del = useCallback(async (id) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    await db.deleteCampaign(id);
  }, []);

  const updateLocal = useCallback((updated) => {
    setCampaigns(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
  }, []);

  return { campaigns, loaded, create, del, updateLocal };
}

/**
 * Hook to manage a single active campaign and all its children.
 * This is the main data hook for CampaignView.
 *
 * It loads sessions, cards, roster, transcript, events for the campaign
 * and provides CRUD operations that write to Supabase with optimistic updates.
 */
export function useActiveCampaign(campaignId) {
  const [campaign, setCampaign] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [cards, setCards] = useState([]);
  const [roster, setRoster] = useState([]);
  const [transcripts, setTranscripts] = useState({}); // sessionId -> entries[]
  const [events, setEvents] = useState({}); // sessionId -> events[]
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Ref for latest state (used in AI processing callbacks)
  const stateRef = useRef({ campaign, sessions, cards, roster, transcripts, events, currentSessionId });
  useEffect(() => {
    stateRef.current = { campaign, sessions, cards, roster, transcripts, events, currentSessionId };
  });

  // Load campaign data
  useEffect(() => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const [campaignData, sessionsData, cardsData, rosterData] = await Promise.all([
          db.fetchCampaigns(null).then(camps => camps), // We'll fetch from state instead
          db.fetchSessions(campaignId),
          db.fetchCards(campaignId),
          db.fetchRoster(campaignId),
        ]);

        if (cancelled) return;

        setSessions(sessionsData);
        setCards(cardsData);
        setRoster(rosterData);

        // Find active session or most recent
        const activeSession = sessionsData.find(s => s.is_active) || sessionsData[sessionsData.length - 1];
        if (activeSession) {
          setCurrentSessionId(activeSession.id);

          // Load transcript and events for active session
          const [transcriptData, eventsData] = await Promise.all([
            db.fetchTranscript(activeSession.id),
            db.fetchEvents(activeSession.id),
          ]);

          if (!cancelled) {
            setTranscripts(prev => ({ ...prev, [activeSession.id]: transcriptData }));
            setEvents(prev => ({ ...prev, [activeSession.id]: eventsData }));
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to load campaign data:', err);
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [campaignId]);

  // ── Campaign operations ──

  const updateCampaignField = useCallback(async (updates) => {
    setCampaign(prev => prev ? { ...prev, ...updates } : prev);
    await db.updateCampaign(campaignId, updates);
  }, [campaignId]);

  const saveDmContext = useCallback(async (ctx) => {
    await updateCampaignField({ dm_context: ctx });
  }, [updateCampaignField]);

  // ── Session operations ──

  const createNewSession = useCallback(async (name) => {
    // Optimistic: deactivate old sessions locally
    setSessions(prev => prev.map(s => s.is_active ? { ...s, is_active: false, end_time: new Date().toISOString() } : s));

    const session = await db.createSession(campaignId, name);
    setSessions(prev => [...prev, session]);
    setCurrentSessionId(session.id);
    setTranscripts(prev => ({ ...prev, [session.id]: [] }));
    setEvents(prev => ({ ...prev, [session.id]: [] }));
    return session;
  }, [campaignId]);

  const switchSession = useCallback(async (sessionId) => {
    setCurrentSessionId(sessionId);

    // Load transcript/events if not cached
    if (!transcripts[sessionId]) {
      const [t, e] = await Promise.all([
        db.fetchTranscript(sessionId),
        db.fetchEvents(sessionId),
      ]);
      setTranscripts(prev => ({ ...prev, [sessionId]: t }));
      setEvents(prev => ({ ...prev, [sessionId]: e }));
    }
  }, [transcripts]);

  const updateSessionField = useCallback(async (sessionId, updates) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...updates } : s));
    await db.updateSession(sessionId, updates);
  }, []);

  // ── Card operations ──

  const addCard = useCallback(async (cardData, genesisText = null) => {
    const newCard = await db.createCard(campaignId, currentSessionId, {
      ...cardData,
      genesis: genesisText,
    });
    setCards(prev => [...prev, newCard]);
    return newCard;
  }, [campaignId, currentSessionId]);

  const addCards = useCallback(async (cardsData) => {
    if (!cardsData.length) return [];
    const newCards = await db.createCards(campaignId, currentSessionId, cardsData);
    setCards(prev => [...prev, ...newCards]);
    return newCards;
  }, [campaignId, currentSessionId]);

  const updateCardLocal = useCallback((id, updates) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const updateCardRemote = useCallback(async (id, updates) => {
    // Optimistic update
    updateCardLocal(id, updates);
    try {
      await db.updateCard(id, updates);
    } catch (err) {
      console.error('Failed to update card:', err);
      // Could revert here, but for now just log
    }
  }, [updateCardLocal]);

  const updateCardsRemote = useCallback(async (cardUpdates) => {
    // cardUpdates: array of { id, updates }
    // Optimistic update all
    for (const { id, updates } of cardUpdates) {
      updateCardLocal(id, updates);
    }
    try {
      await db.updateCards(cardUpdates);
    } catch (err) {
      console.error('Failed to batch update cards:', err);
    }
  }, [updateCardLocal]);

  const deleteCard = useCallback(async (id) => {
    // Optimistic: mark as voided locally
    setCards(prev => prev.map(c =>
      c.id === id
        ? { ...c, voided_at: new Date().toISOString(), voided_in_session: currentSessionId }
        : c
    ));
    await db.voidCard(id, currentSessionId);
  }, [currentSessionId]);

  const restoreFromVoid = useCallback(async (id) => {
    setCards(prev => prev.map(c =>
      c.id === id
        ? { ...c, voided_at: null, voided_in_session: null }
        : c
    ));
    await db.restoreCard(id);
  }, []);

  const permanentlyDelete = useCallback(async (id) => {
    setCards(prev => prev.filter(c => c.id !== id));
    await db.permanentlyDeleteCard(id);
  }, []);

  // ── Transcript operations ──

  const addTranscript = useCallback(async (speaker, text, timestamp) => {
    const sessionId = stateRef.current.currentSessionId;
    const entry = { speaker, text, timestamp, session_id: sessionId, id: `temp-${Date.now()}`, created_at: new Date().toISOString() };

    // Optimistic
    setTranscripts(prev => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] || []), entry],
    }));

    try {
      const saved = await db.addTranscriptEntry(sessionId, speaker, text, timestamp);
      // Replace temp entry with real one
      setTranscripts(prev => ({
        ...prev,
        [sessionId]: (prev[sessionId] || []).map(e => e.id === entry.id ? saved : e),
      }));
      return saved;
    } catch (err) {
      console.error('Failed to save transcript:', err);
      return entry;
    }
  }, []);

  // ── Event operations ──

  const addSessionEvent = useCallback(async (eventData) => {
    const sessionId = stateRef.current.currentSessionId;
    const entry = { ...eventData, session_id: sessionId, id: `temp-${Date.now()}`, created_at: new Date().toISOString() };

    setEvents(prev => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] || []), entry],
    }));

    try {
      const saved = await db.addEvent(sessionId, eventData);
      setEvents(prev => ({
        ...prev,
        [sessionId]: (prev[sessionId] || []).map(e => e.id === entry.id ? saved : e),
      }));
      return saved;
    } catch (err) {
      console.error('Failed to save event:', err);
      return entry;
    }
  }, []);

  const addSessionEvents = useCallback(async (eventsData) => {
    if (!eventsData.length) return [];
    const sessionId = stateRef.current.currentSessionId;

    const tempEntries = eventsData.map((e, i) => ({
      ...e, session_id: sessionId, id: `temp-${Date.now()}-${i}`, created_at: new Date().toISOString()
    }));

    setEvents(prev => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] || []), ...tempEntries],
    }));

    try {
      const saved = await db.addEvents(sessionId, eventsData);
      // Replace temp entries
      setEvents(prev => {
        const current = prev[sessionId] || [];
        const withoutTemps = current.filter(e => !tempEntries.find(t => t.id === e.id));
        return { ...prev, [sessionId]: [...withoutTemps, ...saved] };
      });
      return saved;
    } catch (err) {
      console.error('Failed to save events:', err);
      return tempEntries;
    }
  }, []);

  // ── Roster operations ──

  const upsertRoster = useCallback(async (entry) => {
    const saved = await db.upsertRosterEntry(campaignId, entry);
    setRoster(prev => {
      const exists = prev.find(r => r.id === saved.id);
      if (exists) return prev.map(r => r.id === saved.id ? saved : r);
      return [...prev, saved];
    });
    return saved;
  }, [campaignId]);

  const deleteRoster = useCallback(async (id) => {
    setRoster(prev => prev.filter(r => r.id !== id));
    await db.deleteRosterEntry(id);
  }, []);

  // ── Derived state (mimics old data shape for compatibility) ──

  const activeCards = cards.filter(c => !c.voided_at);
  const voidedCards = cards.filter(c => c.voided_at);
  const currentTranscript = transcripts[currentSessionId] || [];
  const currentEvents = events[currentSessionId] || [];
  const currentSession = sessions.find(s => s.id === currentSessionId);

  // Get events for a specific character across all loaded sessions
  const getCharacterEvents = useCallback((characterName) => {
    const allEvents = [];
    for (const [sessionId, sessionEvents] of Object.entries(events)) {
      const session = sessions.find(s => s.id === sessionId);
      for (const event of sessionEvents) {
        if (event.character?.toLowerCase() === characterName?.toLowerCase()) {
          allEvents.push({ ...event, sessionId, sessionName: session?.name });
        }
      }
    }
    return allEvents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [events, sessions]);

  return {
    // State
    campaign,
    sessions,
    cards: activeCards,
    voidedCards,
    allCards: cards,
    roster,
    currentSessionId,
    currentSession,
    currentTranscript,
    currentEvents,
    loading,

    // Campaign ops
    updateCampaignField,
    saveDmContext,

    // Session ops
    createNewSession,
    switchSession,
    updateSessionField,
    setCurrentSessionId,

    // Card ops
    addCard,
    addCards,
    updateCard: updateCardRemote,
    updateCards: updateCardsRemote,
    updateCardLocal,
    deleteCard,
    restoreFromVoid,
    permanentlyDelete,

    // Transcript ops
    addTranscript,

    // Event ops
    addSessionEvent,
    addSessionEvents,
    getCharacterEvents,

    // Roster ops
    upsertRoster,
    deleteRoster,

    // Ref for AI processing
    stateRef,
  };
}
