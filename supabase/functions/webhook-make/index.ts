import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'

// Make.com stable webhook — patient leads + clinic leads (§5.1, §2.1)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const payload = await req.json()
    const supabase = getServiceClient()

    if (payload.type === 'clinic_lead') {
      const { data: clinic } = await supabase.from('clinics').insert({
        name: payload.clinic_name,
        suburb: payload.suburb,
        email: payload.email,
        phone: payload.phone,
        stage: 'lead',
        country: payload.country ?? 'AU',
      }).select('id').single()

      await supabase.rpc('log_activity', {
        p_event_type: 'clinic.lead_created',
        p_entity_type: 'clinic',
        p_entity_id: clinic!.id,
        p_payload: payload,
      })

      return jsonResponse({ clinic_id: clinic!.id })
    }

    const { data: leadId } = await supabase.rpc('ingest_lead', {
      p_first_name: payload.first_name ?? 'Unknown',
      p_last_name: payload.last_name ?? '',
      p_phone: payload.phone,
      p_email: payload.email,
      p_suburb: payload.suburb,
      p_source: 'make.com',
      p_metadata: payload,
    })

    return jsonResponse({ lead_id: leadId })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
