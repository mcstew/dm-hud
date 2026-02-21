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

    const { campaignId, transcriptEntries, isCampaign } = await req.json()

    const rawText = transcriptEntries.map((e: any) => {
      const prefix = isCampaign && e.sessionName ? `[${e.sessionName}] ` : ''
      return `${prefix}[${e.speaker}] ${e.text}`
    }).join('\n\n')

    const userPrompt = `You are cleaning up a D&D ${isCampaign ? 'campaign' : 'session'} transcript. Your job is ONLY to:
1. Fix obvious transcription errors (e.g., "their" vs "there", run-on words)
2. Add proper punctuation and capitalization
3. Keep paragraphs separated by speaker
4. Preserve EVERYTHING that was said - do not summarize, remove, or add content
5. Keep speaker labels in [SPEAKER] format at the start of each paragraph
${isCampaign ? '6. Keep session markers [Session Name] where they appear to separate sessions' : ''}

Do NOT:
- Add commentary or descriptions
- Remove any dialogue, even if it seems unimportant
- Change the meaning or tone of what was said
- Add stage directions or narrative text

Here is the raw transcript to clean up:

${rawText}

Return ONLY the cleaned transcript, nothing else.`

    const startTime = Date.now()

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const durationMs = Date.now() - startTime
    const aiData = await aiRes.json()
    const polishedText = aiData.content?.[0]?.text?.trim() || ''

    await supabaseClient.from('ai_logs').insert({
      user_id: user.id,
      campaign_id: campaignId,
      function_type: 'polish',
      model: 'claude-haiku-4-5-20250514',
      user_prompt: userPrompt,
      response_text: polishedText,
      tokens_in: aiData.usage?.input_tokens,
      tokens_out: aiData.usage?.output_tokens,
      duration_ms: durationMs,
      error: aiRes.ok ? null : `API Error: ${aiRes.status}`,
    })

    return new Response(JSON.stringify({ polishedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
