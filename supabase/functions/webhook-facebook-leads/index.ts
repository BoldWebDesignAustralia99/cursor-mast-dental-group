import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'

// Facebook Lead Ads webhook (§5.1)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
    const mode = new URL(req.url).searchParams.get('hub.mode')
    const token = new URL(req.url).searchParams.get('hub.verify_token')
    const challenge = new URL(req.url).searchParams.get('hub.challenge')
    if (mode === 'subscribe' && token === Deno.env.get('FACEBOOK_VERIFY_TOKEN')) {
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const body = await req.json()
    const supabase = getServiceClient()

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const fields = change.value?.field_data ?? []
        const get = (n: string) => fields.find((f: { name: string }) => f.name === n)?.values?.[0] ?? ''

        const { data: leadId } = await supabase.rpc('ingest_lead', {
          p_first_name: get('first_name') || 'Unknown',
          p_last_name: get('last_name') || '',
          p_phone: get('phone_number') || get('phone'),
          p_email: get('email'),
          p_suburb: get('city') || get('suburb'),
          p_source: 'facebook',
        })

        await supabase.rpc('emit_notification', {
          p_event_type: 'lead.assigned',
          p_title: 'New lead',
          p_body: `New Facebook lead: ${get('first_name')} ${get('last_name')}`,
          p_target_roles: ['sales_rep', 'manager'],
        })

        return jsonResponse({ lead_id: leadId })
      }
    }
    return jsonResponse({ ok: true })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
