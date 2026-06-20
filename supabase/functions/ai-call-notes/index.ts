import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'
import { callAI } from '../_shared/ai.ts'

// Post-call instant notes — accepts communication_id OR call_log_id (§6)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const body = await req.json() as {
      communication_id?: string
      call_log_id?: string
      transcript?: string
    }
    const supabase = getServiceClient()
    let communicationId = body.communication_id
    let transcript = body.transcript ?? ''

    if (body.call_log_id) {
      const { data: log } = await supabase
        .from('call_logs')
        .select('id, lead_id, transcript, staff_profile_id, to_number')
        .eq('id', body.call_log_id)
        .single()

      if (log) {
        transcript = transcript || (log.transcript as string) || ''
        const { data: comm } = await supabase
          .from('communications')
          .insert({
            channel: 'phone',
            direction: 'outbound',
            staff_id: log.staff_profile_id,
            lead_id: log.lead_id,
            body: transcript.slice(0, 500),
            transcript_summary: null,
            metadata: { call_log_id: log.id, to_number: log.to_number },
          })
          .select('id')
          .single()
        communicationId = comm?.id
        await supabase.from('call_logs').update({ ai_summary: 'processing' }).eq('id', log.id)
      }
    }

    if (!transcript) {
      return jsonResponse({ error: 'transcript required' }, 400)
    }

    let parsed = { summary: transcript.slice(0, 200), disposition: 'follow_up' }
    try {
      const { content } = await callAI({
        useCase: 'call_notes',
        systemPrompt:
          'Summarize this dental sales call and suggest a disposition. Return JSON only: {"summary":"...","disposition":"callback|booked|not_interested|no_answer|follow_up"}',
        userPrompt: transcript,
        temperature: 0.3,
      })
      parsed = JSON.parse(content)
    } catch {
      /* use fallback when AI keys not set */
    }

    if (communicationId) {
      await supabase.from('communications').update({
        transcript_summary: parsed.summary,
        suggested_disposition: parsed.disposition,
      }).eq('id', communicationId)
    }

    if (body.call_log_id) {
      await supabase.from('call_logs').update({
        ai_summary: parsed.summary,
        transcript: transcript,
      }).eq('id', body.call_log_id)
    }

    return jsonResponse({ ...parsed, communication_id: communicationId })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
