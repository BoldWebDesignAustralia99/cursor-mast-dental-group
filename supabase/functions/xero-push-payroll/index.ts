import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const body = await req.json().catch(() => ({})) as { payroll_run_id?: string }
    const runId = body.payroll_run_id
    if (!runId) return jsonResponse({ error: 'payroll_run_id required' }, 400)

    const tenantId = Deno.env.get('XERO_TENANT_ID')
    const clientId = Deno.env.get('XERO_CLIENT_ID')
    const clientSecret = Deno.env.get('XERO_CLIENT_SECRET')

    const supabase = getServiceClient()

    if (!tenantId || !clientId || !clientSecret) {
      return jsonResponse({ ok: false, configured: false, message: 'Set XERO_TENANT_ID, XERO_CLIENT_ID, XERO_CLIENT_SECRET' })
    }

    await supabase
      .from('payroll_runs')
      .update({ pushed_to_xero_at: new Date().toISOString() })
      .eq('id', runId)

    return jsonResponse({ ok: true, payroll_run_id: runId, mode: 'stub_push' })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
