import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'

// Twilio voice webhook — returns TwiML to connect outbound calls + media stream
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const form = await req.formData().catch(() => null)
    const to = form?.get('To')?.toString() ?? new URL(req.url).searchParams.get('To') ?? ''
    const callSid = form?.get('CallSid')?.toString() ?? ''
    const leadId = form?.get('leadId')?.toString() ?? new URL(req.url).searchParams.get('leadId') ?? ''
    const callLogId = form?.get('callLogId')?.toString() ?? new URL(req.url).searchParams.get('callLogId') ?? ''

    const streamUrl = Deno.env.get('TRANSCRIPTION_WS_URL') ?? ''
    const supabase = getServiceClient()

    if (callSid && callLogId) {
      await supabase.from('call_logs').update({ twilio_call_sid: callSid }).eq('id', callLogId)
    }

    const streamXml = streamUrl
      ? `<Start><Stream url="${streamUrl}?leadId=${leadId}&amp;callLogId=${callLogId}" /></Start>`
      : ''

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${streamXml}
  <Dial callerId="${Deno.env.get('TWILIO_FROM_NUMBER') ?? ''}" record="record-from-answer-dual">
    <Number>${to}</Number>
  </Dial>
</Response>`

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml', ...corsHeaders() },
    })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
