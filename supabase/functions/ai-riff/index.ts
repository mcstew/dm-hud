import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('key_mode, anthropic_key_encrypted')
      .eq('id', user.id)
      .single()

    const apiKey = (profile?.key_mode === 'byok' && profile?.anthropic_key_encrypted)
      ? profile.anthropic_key_encrypted
      : Deno.env.get('ANTHROPIC_API_KEY') ?? ''

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'No API key available' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { campaignId, cardName, cardType, cardNotes, dmContext, templatePrompt, templateLabel, templateKey } = await req.json()

    const userPrompt = `You are assisting a Dungeon Master running a D&D 5.5e campaign. Generate creative, atmospheric ${templatePrompt} for ${cardName}, a ${cardType} in their campaign.

Existing notes: ${cardNotes || 'None'}
DM's secret context: ${dmContext || 'None'}

Return ONLY the ${templateLabel} in 1-2 vivid sentences. Be creative and evocative. This is for a tabletop RPG game.`

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
        max_tokens: 150,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const durationMs = Date.now() - startTime
    const aiData = await aiRes.json()
    const riffText = aiData.content?.[0]?.text?.trim() || ''

    await supabaseClient.from('ai_logs').insert({
      user_id: user.id,
      campaign_id: campaignId,
      function_type: 'riff',
      model: 'claude-haiku-4-5',
      user_prompt: userPrompt,
      response_text: riffText,
      parsed_result: { templateKey, cardName, riffText },
      tokens_in: aiData.usage?.input_tokens,
      tokens_out: aiData.usage?.output_tokens,
      duration_ms: durationMs,
      error: aiRes.ok ? null : `API Error: ${aiRes.status}`,
    })

    return new Response(JSON.stringify({ riffText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
