import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const supabase = getServiceClient()
    const body = await req.json().catch(() => ({})) as { clinic_id?: string }
    const clinicId = body.clinic_id

    if (!clinicId) return jsonResponse({ error: 'clinic_id required' }, 400)

    const apiKey = Deno.env.get('PRAKTIKA_API_KEY')
    const { data: clinic } = await supabase.from('clinics').select('id, name, pms_enabled').eq('id', clinicId).single()

    const logEntry = {
      clinic_id: clinicId,
      direction: 'outbound',
      action: 'sync_appointments',
      status: apiKey && clinic?.pms_enabled ? 'completed' : 'stub',
      payload: { clinic_name: clinic?.name, synced_at: new Date().toISOString() },
    }

    await supabase.from('pms_sync_log').insert(logEntry)

    if (!apiKey) {
      return jsonResponse({ ok: true, mode: 'stub', message: 'Set PRAKTIKA_API_KEY for live sync' })
    }

    return jsonResponse({ ok: true, mode: 'logged', clinic_id: clinicId })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
