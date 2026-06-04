import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MODEL = 'claude-haiku-4-5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You turn a Dungeon Master's freeform campaign setup note into structured setup fields.

Return ONLY valid JSON:
{
  "roster": [
    { "playerName": "real person name", "characterName": "in-world character name", "aliases": ["nickname or mispronunciation"] }
  ],
  "arc": "DM-only campaign context, secrets, planned arcs, factions, villains, mysteries, tone, and constraints"
}

Rules:
- Merge with the existing roster and arc. Do not remove existing entries unless the transcript clearly corrects them.
- Do not invent names, classes, facts, villains, or plot threads.
- If the speaker mentions a real player and their PC, put the real person in playerName and the PC in characterName.
- If only a PC is known, leave playerName empty. If only a real player is known, leave characterName empty.
- aliases are only alternate names, nicknames, or likely speech-to-text variants for the character, not class/background notes.
- Keep arc concise but information-rich. Include DM secrets, expected story direction, villains, locations, tone, and unresolved plans.
- For scope "roster", keep arc exactly as the existing arc unless the transcript gives an obvious correction.
- For scope "arc", keep roster exactly as the existing roster unless the transcript gives an obvious correction.
- For scope "campaign", populate both roster and arc when present.`

const stripMarkdownJson = (text: string) => text
  .replace(/^```json\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/```$/i, '')
  .trim()

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    ).auth.getUser(authHeader.replace('Bearer ', ''))

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { campaignId, scope = 'campaign', transcript, existingRoster = [], existingArc = '' } = await req.json()

    if (!campaignId || !transcript?.trim()) {
      return new Response(JSON.stringify({ error: 'Campaign and transcript are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: campaign } = await supabaseClient
      .from('campaigns')
      .select('id, user_id, name')
      .eq('id', campaignId)
      .single()

    if (!campaign || campaign.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Campaign access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('key_mode, anthropic_key_encrypted')
      .eq('id', user.id)
      .single()

    const apiKey = profile?.key_mode === 'managed'
      ? (Deno.env.get('ANTHROPIC_API_KEY') ?? '')
      : (profile?.anthropic_key_encrypted ?? '')

    if (!apiKey) {
      const msg = profile?.key_mode === 'managed'
        ? 'Server API key not configured'
        : 'Please add your Anthropic API key in Settings'
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rosterText = Array.isArray(existingRoster) && existingRoster.length
      ? existingRoster.map((entry: any) => {
        const aliases = Array.isArray(entry.aliases) && entry.aliases.length ? ` aliases: ${entry.aliases.join(', ')}` : ''
        return `- Player: ${entry.playerName || ''} | Character: ${entry.characterName || ''}${aliases}`
      }).join('\n')
      : 'None'

    const userPrompt = `Campaign: ${campaign.name}
Scope: ${scope}

Existing roster:
${rosterText}

Existing arc:
${existingArc || 'None'}

Setup transcript:
${transcript}`

    const startTime = Date.now()
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1600,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const durationMs = Date.now() - startTime

    if (!aiRes.ok) {
      const errorText = await aiRes.text()
      await supabaseClient.from('ai_logs').insert({
        user_id: user.id,
        campaign_id: campaignId,
        function_type: 'campaign_setup',
        model: MODEL,
        system_prompt: SYSTEM_PROMPT,
        user_prompt: userPrompt,
        error: `API Error ${aiRes.status}: ${errorText}`,
        duration_ms: durationMs,
      })

      return new Response(JSON.stringify({ error: `API Error: ${aiRes.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aiData = await aiRes.json()
    const responseText = stripMarkdownJson(aiData.content?.[0]?.text?.trim() || '')
    let parsedResult

    try {
      parsedResult = JSON.parse(responseText)
    } catch {
      parsedResult = { roster: existingRoster, arc: existingArc || '' }
    }

    if (!Array.isArray(parsedResult.roster)) parsedResult.roster = existingRoster
    if (typeof parsedResult.arc !== 'string') parsedResult.arc = existingArc || ''

    await supabaseClient.from('ai_logs').insert({
      user_id: user.id,
      campaign_id: campaignId,
      function_type: 'campaign_setup',
      model: MODEL,
      system_prompt: SYSTEM_PROMPT,
      user_prompt: userPrompt,
      response_text: responseText,
      parsed_result: parsedResult,
      tokens_in: aiData.usage?.input_tokens,
      tokens_out: aiData.usage?.output_tokens,
      duration_ms: durationMs,
    })

    return new Response(JSON.stringify({ result: parsedResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
