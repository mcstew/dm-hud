import { supabase } from './supabase';

// ============================================
// CAMPAIGNS
// ============================================

export async function fetchCampaigns(userId) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createCampaign(userId, name) {
  // Create campaign
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .insert({ user_id: userId, name })
    .select()
    .single();

  if (campError) throw campError;

  // Create first session
  const { data: session, error: sessError } = await supabase
    .from('sessions')
    .insert({
      campaign_id: campaign.id,
      name: 'Session 1',
      is_active: true,
    })
    .select()
    .single();

  if (sessError) throw sessError;

  return { campaign, session };
}

export async function updateCampaign(id, updates) {
  const { data, error } = await supabase
    .from('campaigns')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCampaign(id) {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// SESSIONS
// ============================================

export async function fetchSessions(campaignId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data;
}

export async function createSession(campaignId, name) {
  // Deactivate existing active sessions
  await supabase
    .from('sessions')
    .update({ is_active: false, end_time: new Date().toISOString() })
    .eq('campaign_id', campaignId)
    .eq('is_active', true);

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      campaign_id: campaignId,
      name,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSession(id, updates) {
  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// CARDS
// ============================================

export async function fetchCards(campaignId) {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function createCard(campaignId, sessionId, cardData) {
  const { data, error } = await supabase
    .from('cards')
    .insert({
      campaign_id: campaignId,
      session_id: sessionId,
      type: cardData.type || 'CHARACTER',
      name: cardData.name,
      notes: cardData.notes || '',
      is_canon: cardData.isCanon ?? true,
      is_pc: cardData.isPC ?? false,
      in_party: cardData.inParty ?? false,
      is_hostile: cardData.isHostile ?? false,
      in_combat: cardData.inCombat ?? false,
      hp_current: cardData.hp?.current ?? null,
      hp_max: cardData.hp?.max ?? null,
      ac: cardData.ac ?? null,
      level: cardData.level ?? null,
      class: cardData.class ?? null,
      stats: cardData.stats || {},
      status: cardData.status || [],
      riffs: cardData.riffs || {},
      canon_facts: cardData.canonFacts || [],
      genesis: cardData.genesis ?? null,
      count: cardData.count ?? 1,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createCards(campaignId, sessionId, cardsData) {
  if (!cardsData.length) return [];

  const rows = cardsData.map(cardData => ({
    campaign_id: campaignId,
    session_id: sessionId,
    type: cardData.type || 'CHARACTER',
    name: cardData.name,
    notes: cardData.notes || '',
    is_canon: cardData.isCanon ?? true,
    is_pc: cardData.isPC ?? false,
    in_party: cardData.inParty ?? false,
    is_hostile: cardData.isHostile ?? false,
    in_combat: cardData.inCombat ?? false,
    hp_current: cardData.hp?.current ?? null,
    hp_max: cardData.hp?.max ?? null,
    ac: cardData.ac ?? null,
    level: cardData.level ?? null,
    class: cardData.class ?? null,
    stats: cardData.stats || {},
    status: cardData.status || [],
    riffs: cardData.riffs || {},
    canon_facts: cardData.canonFacts || [],
    genesis: cardData.genesis ?? null,
    count: cardData.count ?? 1,
  }));

  const { data, error } = await supabase
    .from('cards')
    .insert(rows)
    .select();

  if (error) throw error;
  return data;
}

export async function updateCard(id, updates) {
  // Map from frontend camelCase to DB snake_case
  const dbUpdates = {};
  if ('name' in updates) dbUpdates.name = updates.name;
  if ('notes' in updates) dbUpdates.notes = updates.notes;
  if ('type' in updates) dbUpdates.type = updates.type;
  if ('isCanon' in updates) dbUpdates.is_canon = updates.isCanon;
  if ('isPC' in updates) dbUpdates.is_pc = updates.isPC;
  if ('inParty' in updates) dbUpdates.in_party = updates.inParty;
  if ('isHostile' in updates) dbUpdates.is_hostile = updates.isHostile;
  if ('inCombat' in updates) dbUpdates.in_combat = updates.inCombat;
  if ('hp' in updates) {
    dbUpdates.hp_current = updates.hp?.current ?? null;
    dbUpdates.hp_max = updates.hp?.max ?? null;
  }
  if ('ac' in updates) dbUpdates.ac = updates.ac;
  if ('level' in updates) dbUpdates.level = updates.level;
  if ('class' in updates) dbUpdates.class = updates.class;
  if ('stats' in updates) dbUpdates.stats = updates.stats;
  if ('status' in updates) dbUpdates.status = updates.status;
  if ('riffs' in updates) dbUpdates.riffs = updates.riffs;
  if ('canonFacts' in updates) dbUpdates.canon_facts = updates.canonFacts;
  if ('genesis' in updates) dbUpdates.genesis = updates.genesis;
  if ('image' in updates) dbUpdates.image = updates.image;
  if ('count' in updates) dbUpdates.count = updates.count;

  const { data, error } = await supabase
    .from('cards')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCards(cardUpdates) {
  // Batch update: array of { id, updates }
  const results = await Promise.all(
    cardUpdates.map(({ id, updates }) => updateCard(id, updates))
  );
  return results;
}

export async function voidCard(id, sessionId) {
  const { data, error } = await supabase
    .from('cards')
    .update({
      voided_at: new Date().toISOString(),
      voided_in_session: sessionId,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function restoreCard(id) {
  const { data, error } = await supabase
    .from('cards')
    .update({
      voided_at: null,
      voided_in_session: null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function permanentlyDeleteCard(id) {
  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// TRANSCRIPT ENTRIES
// ============================================

export async function fetchTranscript(sessionId) {
  const { data, error } = await supabase
    .from('transcript_entries')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function addTranscriptEntry(sessionId, speaker, text, timestamp) {
  const { data, error } = await supabase
    .from('transcript_entries')
    .insert({
      session_id: sessionId,
      speaker,
      text,
      timestamp,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// EVENTS
// ============================================

export async function fetchEvents(sessionId) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function addEvent(sessionId, eventData) {
  const { data, error } = await supabase
    .from('events')
    .insert({
      session_id: sessionId,
      character: eventData.character,
      type: eventData.type,
      detail: eventData.detail,
      outcome: eventData.outcome || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addEvents(sessionId, eventsData) {
  if (!eventsData.length) return [];

  const rows = eventsData.map(e => ({
    session_id: sessionId,
    character: e.character,
    type: e.type,
    detail: e.detail,
    outcome: e.outcome || null,
  }));

  const { data, error } = await supabase
    .from('events')
    .insert(rows)
    .select();

  if (error) throw error;
  return data;
}

// ============================================
// REPORTS
// ============================================

export async function fetchReports(campaignId, { sessionId = null, scope = null } = {}) {
  let query = supabase
    .from('reports')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (sessionId) query = query.eq('session_id', sessionId);
  if (scope) query = query.eq('scope', scope);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createReport(userId, campaignId, sessionId, scope, reportData) {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      user_id: userId,
      campaign_id: campaignId,
      session_id: sessionId || null,
      scope,
      report_data: reportData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteReport(id) {
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// CAMPAIGN TRANSCRIPTS (cross-session)
// ============================================

export async function fetchAllCampaignTranscripts(campaignId) {
  const { data: sessionData, error: sessionError } = await supabase
    .from('sessions')
    .select('id, name')
    .eq('campaign_id', campaignId)
    .order('start_time', { ascending: true });

  if (sessionError) throw sessionError;
  if (!sessionData.length) return { entries: [], sessionMap: {} };

  const sessionMap = Object.fromEntries(sessionData.map(s => [s.id, s.name]));
  const sessionIds = sessionData.map(s => s.id);

  const { data, error } = await supabase
    .from('transcript_entries')
    .select('*')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return { entries: data || [], sessionMap };
}

// ============================================
// PLAYER ROSTER
// ============================================

export async function fetchRoster(campaignId) {
  const { data, error } = await supabase
    .from('player_roster')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('player_name', { ascending: true });

  if (error) throw error;
  return data;
}

export async function upsertRosterEntry(campaignId, entry) {
  const hasPersistedId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(entry.id || ''));
  const row = {
    campaign_id: campaignId,
    player_name: entry.playerName,
    character_name: entry.characterName,
    character_id: entry.characterId || null,
    aliases: entry.aliases || [],
  };

  if (hasPersistedId) {
    // Update existing
    const { data, error } = await supabase
      .from('player_roster')
      .update(row)
      .eq('id', entry.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('player_roster')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function deleteRosterEntry(id) {
  const { error } = await supabase
    .from('player_roster')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// PROFILES
// ============================================

export async function saveOwnProfileSettings({ displayName, anthropicKey, deepgramKey }) {
  const { data, error } = await supabase.rpc('update_own_profile_settings', {
    p_display_name: displayName ?? null,
    p_anthropic_key: anthropicKey ?? null,
    p_deepgram_key: deepgramKey ?? null,
  });

  if (error) throw error;
  return data;
}

export async function adminUpdateProfile(id, updates) {
  const { data, error } = await supabase.rpc('admin_update_profile', {
    p_user_id: id,
    p_key_mode: updates.key_mode ?? null,
    p_is_superuser: updates.is_superuser ?? null,
    p_display_name: updates.display_name ?? null,
  });

  if (error) throw error;
  return data;
}

export async function touchProfileActivity() {
  const { error } = await supabase.rpc('touch_profile_activity');
  if (error) throw error;
}

export async function recordUsageEvent({
  eventType,
  campaignId = null,
  sessionId = null,
  provider = null,
  model = null,
  quantity = null,
  unit = null,
  metadata = {},
}) {
  const { data, error } = await supabase.rpc('record_usage_event', {
    p_event_type: eventType,
    p_campaign_id: campaignId,
    p_session_id: sessionId,
    p_provider: provider,
    p_model: model,
    p_quantity: quantity,
    p_unit: unit,
    p_metadata: metadata,
  });

  if (error) throw error;
  return data;
}

// ============================================
// ADMIN QUERIES
// ============================================

export async function adminFetchUsers(searchTerm = '') {
  let query = supabase
    .from('profiles')
    .select('id, email, display_name, key_mode, is_superuser, created_at, last_active_at')
    .order('created_at', { ascending: false });

  if (searchTerm) {
    query = query.or(`email.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%,id.eq.${searchTerm}`);
  }

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data;
}

export async function adminFetchUserDetail(userId) {
  const [profileRes, campaignsRes, usageRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, display_name, key_mode, is_superuser, created_at, last_active_at')
      .eq('id', userId)
      .single(),
    supabase.from('campaigns').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    supabase
      .from('usage_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (profileRes.error) throw profileRes.error;

  const campaignIds = (campaignsRes.data || []).map(c => c.id);
  let sessions = [];
  let transcriptCount = 0;

  if (campaignIds.length) {
    const sessionsRes = await supabase
      .from('sessions')
      .select('id, campaign_id, name, start_time, end_time, is_active, created_at')
      .in('campaign_id', campaignIds)
      .order('start_time', { ascending: false })
      .limit(100);

    sessions = sessionsRes.data || [];

    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length) {
      const transcriptRes = await supabase
        .from('transcript_entries')
        .select('id', { count: 'exact', head: true })
        .in('session_id', sessionIds);
      transcriptCount = transcriptRes.count || 0;
    }
  }

  return {
    profile: profileRes.data,
    campaigns: campaignsRes.data || [],
    sessions,
    transcriptCount,
    usageEvents: usageRes.data || [],
  };
}

export async function adminFetchAILogs({ userId, campaignId, functionType, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('ai_logs')
    .select('*, profiles(email, display_name)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) query = query.eq('user_id', userId);
  if (campaignId) query = query.eq('campaign_id', campaignId);
  if (functionType) query = query.eq('function_type', functionType);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function adminFetchAllCampaigns(searchTerm = '') {
  let query = supabase
    .from('campaigns')
    .select('*, profiles(email, display_name)')
    .order('updated_at', { ascending: false });

  if (searchTerm) {
    query = query.ilike('name', `%${searchTerm}%`);
  }

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data;
}

export async function adminFetchStats() {
  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    usersRes,
    dauRes,
    wauRes,
    campaignsRes,
    sessionsRes,
    aiLogsRes,
    aiLogsTodayRes,
    aiErrorsTodayRes,
    usageTodayRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_active_at', oneDayAgo),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_active_at', sevenDaysAgo),
    supabase.from('campaigns').select('id', { count: 'exact', head: true }),
    supabase.from('sessions').select('id', { count: 'exact', head: true }),
    supabase.from('ai_logs').select('id', { count: 'exact', head: true }),
    supabase.from('ai_logs').select('id', { count: 'exact', head: true }).gte('created_at', oneDayAgo),
    supabase.from('ai_logs').select('id', { count: 'exact', head: true }).gte('created_at', oneDayAgo).not('error', 'is', null),
    supabase
      .from('usage_events')
      .select('event_type, quantity, unit')
      .gte('created_at', oneDayAgo)
      .in('event_type', ['live_transcription_seconds', 'file_transcription_seconds']),
  ]);

  const transcriptionSecondsToday = (usageTodayRes.data || [])
    .filter(e => e.unit === 'seconds')
    .reduce((sum, e) => sum + Number(e.quantity || 0), 0);

  return {
    totalUsers: usersRes.count || 0,
    dau: dauRes.count || 0,
    wau: wauRes.count || 0,
    totalCampaigns: campaignsRes.count || 0,
    totalSessions: sessionsRes.count || 0,
    totalAICalls: aiLogsRes.count || 0,
    aiCallsToday: aiLogsTodayRes.count || 0,
    aiErrorsToday: aiErrorsTodayRes.count || 0,
    transcriptionMinutesToday: Math.round(transcriptionSecondsToday / 60),
  };
}
