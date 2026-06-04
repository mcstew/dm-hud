import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MODEL = 'claude-haiku-4-5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_CARD_TYPES = ['CHARACTER', 'LOCATION', 'ITEM', 'PLOT', 'ENEMY']

const SYSTEM_PROMPT = `You turn a Dungeon Master's short spoken description into ONE draft DM HUD card.

Return ONLY valid JSON:
{
  "card": {
    "type": "CHARACTER | LOCATION | ITEM | PLOT",
    "name": "short canonical display name",
    "notes": "concise useful card notes",
    "isPC": false,
    "inParty": false,
    "isHostile": false,
    "inCombat": false,
    "hp": { "current": 12, "max": 12 }
  }
}

Rules:
- Produce exactly one primary card for the requested card kind. Do not return multiple cards.
- Do not invent important facts. You may infer a concise title/name from the transcript.
- Keep uncertain or secondary details in notes.
- If a name is unclear, choose the shortest useful noun phrase from the transcript.
- If the requested kind is ENEMY, return type CHARACTER with isHostile true, inCombat true, isPC false, and inParty false.
- If the requested kind is CHARACTER, infer isPC/inParty only when the speaker clearly describes a player character or party member.
- If HP is spoken as a number, set hp.current and hp.max to that number. Otherwise omit hp or use null.
- For LOCATION, ITEM, and PLOT cards, omit character-only flags unless needed for valid JSON; do not add HP.
- Existing entities are context to avoid duplicate/confusing names, but the user is manually creating/editing a draft, so still return the best card draft from the transcript.
- Notes should be plain text, no markdown bullets unless the transcript naturally contains a list.`

const stripMarkdownJson = (text: string) => text
  .replace(/^```json\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/```$/i, '')
  .trim()

const formatCards = (cards: any[]) => {
  if (!Array.isArray(cards) || cards.length === 0) return 'None'
  return cards.slice(0, 80).map(card => {
    const type = card.type === 'ENEMY' ? 'CHARACTER' : (card.type || 'CHARACTER')
    const flags = [
      card.isPC ? 'PC' : null,
      card.inParty ? 'party' : null,
      card.isHostile ? 'hostile' : null,
      card.inCombat ? 'in combat' : null,
    ].filter(Boolean).join(', ')
    return `- ${type}: ${card.name || 'Unnamed'}${flags ? ` (${flags})` : ''}${card.notes ? ` — ${String(card.notes).slice(0, 220)}` : ''}`
  }).join('\n')
}

const formatRoster = (roster: any[]) => {
  if (!Array.isArray(roster) || roster.length === 0) return 'None'
  return roster.map(entry => {
    const aliases = Array.isArray(entry.aliases) && entry.aliases.length ? ` aliases: ${entry.aliases.join(', ')}` : ''
    return `- Player: ${entry.playerName || ''} | Character: ${entry.characterName || ''}${aliases}`
  }).join('\n')
}

const normalizeCard = (rawCard: any, requestedType: string) => {
  const normalizedType = requestedType === 'ENEMY'
    ? 'CHARACTER'
    : (['CHARACTER', 'LOCATION', 'ITEM', 'PLOT'].includes(rawCard?.type) ? rawCard.type : requestedType)

  const name = String(rawCard?.name || '').trim()
  const notes = String(rawCard?.notes || '').trim()
  const card: Record<string, unknown> = {
    type: normalizedType,
    name,
    notes,
    isCanon: true,
  }

  if (normalizedType === 'CHARACTER') {
    const isEnemy = requestedType === 'ENEMY'
    const isPC = Boolean(rawCard?.isPC) && !isEnemy
    card.isPC = isPC
    card.inParty = isEnemy ? false : Boolean(rawCard?.inParty || isPC)
    card.isHostile = isEnemy ? true : Boolean(rawCard?.isHostile)
    card.inCombat = isEnemy ? true : Boolean(rawCard?.inCombat)

    const hp = rawCard?.hp
    const current = Number(hp?.current ?? hp?.max)
    const max = Number(hp?.max ?? hp?.current)
    if (Number.isFinite(current) && Number.isFinite(max) && max > 0) {
      card.hp = {
        current: Math.max(0, Math.round(current)),
        max: Math.max(1, Math.round(max)),
      }
    }
  }

  return card
}

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

    const {
      campaignId,
      cardType = 'CHARACTER',
      transcript,
      existingCards = [],
      roster = [],
      dmContext = '',
    } = await req.json()

    const requestedType = ALLOWED_CARD_TYPES.includes(cardType) ? cardType : 'CHARACTER'

    if (!campaignId || !String(transcript || '').trim()) {
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

    const userPrompt = `Campaign: ${campaign.name}
Requested card kind: ${requestedType}

Player roster:
${formatRoster(roster)}

Existing entities:
${formatCards(existingCards)}

DM-only campaign context:
${dmContext || 'None'}

Spoken card description:
${String(transcript).trim()}`

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
        max_tokens: 900,
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
        function_type: 'card_voice_fill',
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
      parsedResult = { card: { type: requestedType === 'ENEMY' ? 'CHARACTER' : requestedType, name: '', notes: '' } }
    }

    const parsedCard = normalizeCard(parsedResult.card || parsedResult, requestedType)

    await supabaseClient.from('ai_logs').insert({
      user_id: user.id,
      campaign_id: campaignId,
      function_type: 'card_voice_fill',
      model: MODEL,
      system_prompt: SYSTEM_PROMPT,
      user_prompt: userPrompt,
      response_text: responseText,
      parsed_result: { card: parsedCard },
      tokens_in: aiData.usage?.input_tokens,
      tokens_out: aiData.usage?.output_tokens,
      duration_ms: durationMs,
    })

    return new Response(JSON.stringify({ result: { card: parsedCard } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
