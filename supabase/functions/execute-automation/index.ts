import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'

// Executes automation workflow steps (SMS, email) for a queued run
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const supabase = getServiceClient()
    const body = await req.json().catch(() => ({})) as {
      run_id?: string
      automation_id?: string
      payload?: Record<string, unknown>
    }

    const runId = body.run_id
    const automationId = body.automation_id
    if (!runId || !automationId) {
      return jsonResponse({ error: 'run_id and automation_id required' }, 400)
    }

    const { data: steps, error: stepsErr } = await supabase
      .from('automation_steps')
      .select('id, step_order, step_type, config, template_body')
      .eq('automation_id', automationId)
      .order('step_order')

    if (stepsErr) throw stepsErr

    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID_AU') ?? Deno.env.get('TWILIO_ACCOUNT_SID_US')
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN_AU') ?? Deno.env.get('TWILIO_AUTH_TOKEN_US')
    const twilioFrom = Deno.env.get('TWILIO_FROM_NUMBER')

    const results: unknown[] = []

    for (const step of steps ?? []) {
      const template = (step.template_body as string) ?? ''
      const rendered = template
        .replace(/\{\{first_name\}\}/g, String(body.payload?.first_name ?? 'there'))
        .replace(/\{\{clinic_name\}\}/g, String(body.payload?.clinic_name ?? 'your clinic'))
        .replace(/\{\{appointment_time\}\}/g, String(body.payload?.appointment_time ?? 'your appointment'))

      if (step.step_type === 'sms' && twilioSid && twilioToken && twilioFrom) {
        const to = String(body.payload?.phone ?? body.payload?.to ?? '')
        if (to) {
          const auth = btoa(`${twilioSid}:${twilioToken}`)
          const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: 'POST',
              headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({ To: to, From: twilioFrom, Body: rendered }),
            },
          )
          results.push({ step: step.step_order, channel: 'sms', sent: res.ok })
        } else {
          results.push({ step: step.step_order, channel: 'sms', sent: false, reason: 'no phone' })
        }
      } else if (step.step_type === 'email') {
        // Log as communication — email provider wired via Make/Zapier webhook in production
        await supabase.from('communications').insert({
          channel: 'email',
          direction: 'outbound',
          body: rendered,
          clinic_id: body.payload?.clinic_id ?? null,
          booking_id: body.payload?.booking_id ?? null,
        })
        results.push({ step: step.step_order, channel: 'email', sent: true, mode: 'logged' })
      } else {
        results.push({ step: step.step_order, channel: step.step_type, sent: false, mode: 'stub' })
      }
    }

    await supabase
      .from('automation_runs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', runId)

    return jsonResponse({ ok: true, run_id: runId, results })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
