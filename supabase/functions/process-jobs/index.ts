import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'

// Background job worker — processes job_queue entries (§8 durable worker layer)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const supabase = getServiceClient()
    const batchSize = Math.min(Number(new URL(req.url).searchParams.get('batch') ?? 10), 50)
    const results: unknown[] = []

    for (let i = 0; i < batchSize; i++) {
      const { data, error } = await supabase.rpc('process_next_job')
      if (error) throw error
      const parsed = data as { processed?: boolean }
      if (!parsed?.processed) break
      results.push(parsed)
    }

    return jsonResponse({ ok: true, processed: results.length, results })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
