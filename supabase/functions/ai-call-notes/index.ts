import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'
import { callAI } from '../_shared/ai.ts'

// Post-call instant notes (§6)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const { communication_id, transcript } = await req.json()
    const supabase = getServiceClient()

    const { content } = await callAI({
      useCase: 'call_notes',
      systemPrompt: 'Summarize this sales call and suggest a disposition. Return JSON: {"summary":"...","disposition":"..."}',
      userPrompt: transcript,
      temperature: 0.3,
    })

    let parsed = { summary: content, disposition: 'unknown' }
    try { parsed = JSON.parse(content) } catch { /* default */ }

    await supabase.from('communications').update({
      transcript_summary: parsed.summary,
      suggested_disposition: parsed.disposition,
    }).eq('id', communication_id)

    return jsonResponse(parsed)
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
