import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''

async function invokeExecuteAutomation(payload: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/execute-automation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify(payload),
  })
  return res.json()
}

// Background job worker — processes job_queue entries
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const supabase = getServiceClient()
    const batchSize = Math.min(Number(new URL(req.url).searchParams.get('batch') ?? 10), 50)
    const results: unknown[] = []

    for (let i = 0; i < batchSize; i++) {
      const { data: job, error: fetchErr } = await supabase
        .from('job_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for')
        .limit(1)
        .maybeSingle()

      if (fetchErr) throw fetchErr
      if (!job) break

      await supabase
        .from('job_queue')
        .update({ status: 'processing', started_at: new Date().toISOString(), attempts: (job.attempts ?? 0) + 1 })
        .eq('id', job.id)

      let result: unknown

      if (job.job_type === 'process_domain_event') {
        await supabase
          .from('domain_events')
          .update({ processed_at: new Date().toISOString() })
          .eq('id', job.payload?.event_id)
        result = { event_id: job.payload?.event_id }
      } else if (job.job_type === 'execute_automation') {
        result = await invokeExecuteAutomation(job.payload as Record<string, unknown>)
      } else {
        result = { job_type: job.job_type, skipped: true }
      }

      await supabase
        .from('job_queue')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', job.id)

      results.push({ job_id: job.id, job_type: job.job_type, result })
    }

    return jsonResponse({ ok: true, processed: results.length, results })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
