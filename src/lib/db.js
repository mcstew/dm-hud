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
  const row = {
    campaign_id: campaignId,
    player_name: entry.playerName,
    character_name: entry.characterName,
    character_id: entry.characterId || null,
    aliases: entry.aliases || [],
  };

  if (entry.id) {
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
// PROFILES (for admin)
// ============================================

export async function updateProfile(id, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// ADMIN QUERIES
// ============================================

export async function adminFetchUsers(searchTerm = '') {
  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (searchTerm) {
    query = query.or(`email.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%,id.eq.${searchTerm}`);
  }

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data;
}

export async function adminFetchUserDetail(userId) {
  const [profileRes, campaignsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('campaigns').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
  ]);

  if (profileRes.error) throw profileRes.error;
  return {
    profile: profileRes.data,
    campaigns: campaignsRes.data || [],
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

  const [usersRes, dauRes, aiLogsRes, aiLogsTodayRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_active_at', oneDayAgo),
    supabase.from('ai_logs').select('id', { count: 'exact', head: true }),
    supabase.from('ai_logs').select('id', { count: 'exact', head: true }).gte('created_at', oneDayAgo),
  ]);

  return {
    totalUsers: usersRes.count || 0,
    dau: dauRes.count || 0,
    totalAICalls: aiLogsRes.count || 0,
    aiCallsToday: aiLogsTodayRes.count || 0,
  };
}
