import { supabase } from './supabase';

/**
 * AI service layer — all AI calls go through Supabase Edge Functions.
 * The Edge Function handles key resolution (managed vs BYOK) and logging.
 */

export async function processTranscript({ campaignId, sessionId, texts, existingCards, roster, recentTranscript, dmContext }) {
  const { data, error } = await supabase.functions.invoke('ai-process', {
    body: {
      campaignId,
      sessionId,
      texts,
      existingCards,
      roster,
      recentTranscript,
      dmContext,
    },
  });

  if (error) throw error;
  return data;
}

export async function generateRiff({ campaignId, cardName, cardType, cardNotes, dmContext, templatePrompt, templateLabel, templateKey }) {
  const { data, error } = await supabase.functions.invoke('ai-riff', {
    body: {
      campaignId,
      cardName,
      cardType,
      cardNotes,
      dmContext,
      templatePrompt,
      templateLabel,
      templateKey,
    },
  });

  if (error) throw error;
  return data;
}

export async function generateReport({ campaignId, sessionId, transcript, events, pcNames }) {
  const { data, error } = await supabase.functions.invoke('ai-report', {
    body: {
      campaignId,
      sessionId,
      transcript,
      events,
      pcNames,
    },
  });

  if (error) throw error;
  return data;
}

export async function polishTranscript({ campaignId, transcriptEntries, isCampaign }) {
  const { data, error } = await supabase.functions.invoke('ai-polish', {
    body: {
      campaignId,
      transcriptEntries,
      isCampaign,
    },
  });

  if (error) throw error;
  return data;
}

export async function getDeepgramKey() {
  const { data, error } = await supabase.functions.invoke('get-deepgram-key');
  if (error) throw error;
  return data.key;
}
