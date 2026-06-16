import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'
import { callAI, stripStaffNames } from '../_shared/ai.ts'

// Classify booking from transcript (§4)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const { booking_id, transcript, strict_mode } = await req.json()
    const supabase = getServiceClient()

    const systemPrompt = `You classify dental implant bookings. Return JSON: {"classification":"multi_implant|all_on_x|single_implant|cosmetic_only|unknown","reasoning":"..."}. strict_mode guards against false single_implant.`
    const { content } = await callAI({
      useCase: 'classification',
      systemPrompt,
      userPrompt: transcript,
      temperature: 0.2,
    })

    let parsed = { classification: 'unknown', reasoning: content }
    try { parsed = JSON.parse(content) } catch { /* use default */ }

    const reasoning = stripStaffNames(parsed.reasoning ?? '')

    await supabase.from('booking_classifications').insert({
      booking_id,
      classification: parsed.classification,
      source: 'transcript',
      is_locked: true,
      ai_reasoning: reasoning,
    })

    await supabase.rpc('log_activity', {
      p_event_type: 'classification.applied',
      p_entity_type: 'booking',
      p_entity_id: booking_id,
      p_payload: { classification: parsed.classification, strict_mode },
    })

    return jsonResponse({ classification: parsed.classification, reasoning })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
