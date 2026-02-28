/**
 * Mappers between Supabase snake_case DB rows and the frontend camelCase format.
 * The existing App.jsx UI code expects camelCase properties — these mappers
 * let us use the existing UI code with minimal changes.
 */

// ── Card: DB → Frontend ──
export function dbCardToFrontend(dbCard) {
  return {
    id: dbCard.id,
    type: dbCard.type,
    name: dbCard.name,
    notes: dbCard.notes,
    isCanon: dbCard.is_canon,
    isPC: dbCard.is_pc,
    inParty: dbCard.in_party,
    isHostile: dbCard.is_hostile,
    inCombat: dbCard.in_combat,
    hp: (dbCard.hp_current != null || dbCard.hp_max != null)
      ? { current: dbCard.hp_current ?? 0, max: dbCard.hp_max ?? 0 }
      : null,
    ac: dbCard.ac,
    level: dbCard.level,
    class: dbCard.class,
    stats: dbCard.stats || {},
    status: dbCard.status || [],
    riffs: dbCard.riffs || {},
    canonFacts: dbCard.canon_facts || [],
    genesis: dbCard.genesis,
    count: dbCard.count,
    image: dbCard.image,
    sessionId: dbCard.session_id,
    createdAt: dbCard.created_at,
    voidedAt: dbCard.voided_at,
    voidedInSession: dbCard.voided_in_session,
    campaignId: dbCard.campaign_id,
  };
}

// ── Card: Frontend → DB updates (partial) ──
export function frontendCardToDbUpdates(updates) {
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
  return dbUpdates;
}

// ── Session: DB → Frontend ──
export function dbSessionToFrontend(dbSession) {
  return {
    id: dbSession.id,
    name: dbSession.name,
    startTime: dbSession.start_time,
    endTime: dbSession.end_time,
    isActive: dbSession.is_active,
    campaignId: dbSession.campaign_id,
    // transcript and events are loaded separately
    transcript: [],
    events: [],
  };
}

// ── Transcript Entry: DB → Frontend ──
export function dbTranscriptToFrontend(dbEntry) {
  return {
    id: dbEntry.id,
    speaker: dbEntry.speaker,
    text: dbEntry.text,
    timestamp: dbEntry.timestamp,
  };
}

// ── Event: DB → Frontend ──
export function dbEventToFrontend(dbEvent) {
  return {
    id: dbEvent.id,
    character: dbEvent.character,
    type: dbEvent.type,
    detail: dbEvent.detail,
    outcome: dbEvent.outcome,
    timestamp: dbEvent.created_at,
    sessionId: dbEvent.session_id,
  };
}

// ── Report: DB → Frontend ──
export function dbReportToFrontend(dbReport) {
  return {
    id: dbReport.id,
    userId: dbReport.user_id,
    campaignId: dbReport.campaign_id,
    sessionId: dbReport.session_id,
    scope: dbReport.scope,
    reportData: dbReport.report_data,
    createdAt: dbReport.created_at,
  };
}

// ── Campaign Transcript Entry: DB → Frontend (with session name) ──
export function dbCampaignTranscriptToFrontend(dbEntry, sessionName) {
  return {
    id: dbEntry.id,
    speaker: dbEntry.speaker,
    text: dbEntry.text,
    timestamp: dbEntry.timestamp,
    sessionName: sessionName || 'Session',
  };
}

// ── Roster Entry: DB → Frontend ──
export function dbRosterToFrontend(dbEntry) {
  return {
    id: dbEntry.id,
    playerName: dbEntry.player_name,
    characterName: dbEntry.character_name,
    characterId: dbEntry.character_id,
    aliases: dbEntry.aliases || [],
  };
}

// ── Campaign: DB → Frontend ──
export function dbCampaignToFrontend(dbCampaign) {
  return {
    id: dbCampaign.id,
    name: dbCampaign.name,
    dmContext: dbCampaign.dm_context || '',
    createdAt: dbCampaign.created_at,
    updatedAt: dbCampaign.updated_at,
    userId: dbCampaign.user_id,
  };
}
