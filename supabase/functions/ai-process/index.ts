import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are analyzing D&D gameplay transcript to extract and update entities.

INSTRUCTIONS:
1. NEVER create CHARACTER cards for real PLAYER names (left side of roster arrows) - these are out-of-game identities
2. DO create CHARACTER cards for in-game character names (right side of roster arrows) on FIRST mention if they don't exist yet
3. Entity TYPE rules:
   - CHARACTER: ALL people/creatures (goblins, orcs, bandits, thieves, NPCs, party members, monsters, everyone)
     - Set "isHostile": true if attacking, aggressive, ambushing, or clearly enemy combatants
     - Set "isHostile": false if friendly/neutral/not yet hostile
     - Set "inCombat": true when they engage in combat (attacking OR being attacked OR ambushing)
   - LOCATION: Places (taverns, caves, cities, dungeons)
   - ITEM: Objects (weapons, treasure, quest items, artifacts)
   - PLOT: Story threads, mysteries, quests
4. Combat state management - IMPORTANT:
   - "ambushed by goblins" → CREATE goblins with {"inCombat": true, "isHostile": true} AND trigger modeSwitch: "combat"
   - "three goblins attack" → CREATE goblins with {"inCombat": true, "isHostile": true}
   - "tall goblin draws sword and charges" → UPDATE that goblin: {"inCombat": true, "isHostile": true}
   - "party negotiates successfully" → UPDATE enemies: {"inCombat": false, "isHostile": false}
   - When combat starts, BOTH attackers AND defenders get "inCombat": true
   - AMBUSH = combat. Ambushing creatures are ALWAYS hostile and in combat.
5. If a character name or alias from the roster is mentioned AGAIN, update the EXISTING character card (don't create duplicates)
6. CRITICAL - Entity clarification patterns (UPDATE existing, DON'T create new):
   - "the barmaid introduces herself as Greta" → UPDATE existing "barmaid" with name: "Greta"
   - "the tall goblin in the middle" → UPDATE existing goblin with description
   - Look at RECENT CONTEXT - if a generic term was JUST mentioned, this is likely a clarification
7. For multiple creatures (e.g., "three goblins", "six thieves"), use "count" field (count: 3, count: 6)
8. Only create NEW entities if they're genuinely new, not clarifications of recent mentions
9. IMPORTANT: Detect HP changes from phrases like:
   - "X takes 5 damage" → {"name": "X", "damage": 5}
   - "The orc did 3 points of damage to Y" → {"name": "Y", "damage": 3}
   - "X deals 8 damage to Y" → {"name": "Y", "damage": 8}
   - "heals for 10" → {"name": "X", "healing": 10}
10. Extract D&D 5.5e stats when mentioned:
   - Ability scores (STR, DEX, CON, INT, WIS, CHA)
   - AC, Level, Class
11. IMPORTANT: Extract character events/milestones:
   - Ability checks, saving throws, attack rolls, discoveries, level ups, story moments

Return ONLY valid JSON (no markdown):
{
  "newCards": [{"type": "CHARACTER", "name": "...", "notes": "...", "isCanon": true, "isPC": false, "inParty": false, "isHostile": false, "inCombat": false, "count": 1}],
  "cardUpdates": [{"name": "...", "updates": {...}}],
  "hpChanges": [{"name": "...", "damage": 5}],
  "statusChanges": [{"name": "...", "addStatus": ["Poisoned"]}],
  "events": [{"character": "...", "type": "check", "detail": "...", "outcome": "success"}],
  "modeSwitch": "combat"
}

If no changes, return empty arrays.`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the user from the auth header
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

    // Get user's profile to determine key mode
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('key_mode, anthropic_key_encrypted')
      .eq('id', user.id)
      .single()

    // Resolve API key based on user's key mode
    let apiKey: string
    if (profile?.key_mode === 'managed') {
      // Managed mode: use the server's shared key
      apiKey = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
    } else {
      // BYOK mode: user must provide their own key
      apiKey = profile?.anthropic_key_encrypted ?? ''
    }

    if (!apiKey) {
      const msg = profile?.key_mode === 'managed'
        ? 'Server API key not configured'
        : 'Please add your Anthropic API key in Settings'
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { campaignId, sessionId, texts, existingCards, roster, recentTranscript, dmContext } = await req.json()

    const combinedText = texts.join(' | ')

    const userPrompt = `PLAYER ROSTER (DO NOT create cards for these real player names - only their character names):
${roster}

EXISTING ENTITIES:
${existingCards}

RECENT CONTEXT:
${recentTranscript}

NEW TRANSCRIPT: ${combinedText}

DM SECRET CONTEXT: ${dmContext || 'None'}`

    const startTime = Date.now()

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const durationMs = Date.now() - startTime

    if (!aiRes.ok) {
      const errorText = await aiRes.text()
      // Log the error
      await supabaseClient.from('ai_logs').insert({
        user_id: user.id,
        campaign_id: campaignId,
        session_id: sessionId,
        function_type: 'entity_extraction',
        model: 'claude-haiku-4-5',
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
    let responseText = aiData.content?.[0]?.text?.trim() || ''

    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    let parsedResult
    try {
      parsedResult = JSON.parse(responseText)
    } catch {
      parsedResult = { newCards: [], cardUpdates: [], hpChanges: [], statusChanges: [], events: [] }
    }

    // Log the successful call
    await supabaseClient.from('ai_logs').insert({
      user_id: user.id,
      campaign_id: campaignId,
      session_id: sessionId,
      function_type: 'entity_extraction',
      model: 'claude-haiku-4-5',
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
