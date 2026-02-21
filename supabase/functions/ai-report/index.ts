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

    const apiKey = profile?.key_mode === 'managed'
      ? (Deno.env.get('ANTHROPIC_API_KEY') ?? '')
      : (profile?.anthropic_key_encrypted ?? '')

    if (!apiKey) {
      const msg = profile?.key_mode === 'managed' ? 'Server API key not configured' : 'Please add your Anthropic API key in Settings'
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { campaignId, sessionId, transcript, events, pcNames } = await req.json()

    const userPrompt = `You are a D&D session chronicler. Generate a session report from this gameplay transcript and events.

PLAYER CHARACTERS: ${pcNames.join(', ')}

TRANSCRIPT:
${transcript}

KEY EVENTS:
${events}

Generate a JSON report with:
{
  "recap": "2-3 paragraph narrative summary of what happened in the session",
  "mvp": {"character": "name", "reason": "why they were MVP this session"},
  "highlights": ["3-5 memorable moments from the session"],
  "quotes": [{"character": "name", "text": "memorable quote"}],
  "events": [{"character": "name", "detail": "significant event"}]
}

Focus on storytelling, dramatic moments, and player achievements. Be concise but engaging.`

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
        max_tokens: 2048,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const durationMs = Date.now() - startTime
    const aiData = await aiRes.json()
    let responseText = aiData.content?.[0]?.text?.trim() || ''

    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    let report
    try {
      report = JSON.parse(responseText)
    } catch {
      report = { recap: responseText, mvp: null, highlights: [], quotes: [], events: [] }
    }

    await supabaseClient.from('ai_logs').insert({
      user_id: user.id,
      campaign_id: campaignId,
      session_id: sessionId,
      function_type: 'report',
      model: 'claude-haiku-4-5',
      user_prompt: userPrompt,
      response_text: responseText,
      parsed_result: report,
      tokens_in: aiData.usage?.input_tokens,
      tokens_out: aiData.usage?.output_tokens,
      duration_ms: durationMs,
      error: aiRes.ok ? null : `API Error: ${aiRes.status}`,
    })

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
