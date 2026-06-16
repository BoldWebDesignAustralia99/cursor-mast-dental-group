import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'

// GoCardless payment webhook (§2.4)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const body = await req.json()
    const supabase = getServiceClient()
    const event = body.events?.[0]
    if (!event) return jsonResponse({ ok: true })

    if (event.resource_type === 'payments' && event.action === 'confirmed') {
      const clinicId = event.metadata?.clinic_id
      const credits = parseInt(event.metadata?.credits ?? '0', 10)
      if (clinicId && credits > 0) {
        const { data: clinic } = await supabase.from('clinics').select('credit_balance').eq('id', clinicId).single()
        const newBalance = (clinic?.credit_balance ?? 0) + credits
        await supabase.from('clinics').update({ credit_balance: newBalance }).eq('id', clinicId)
        await supabase.from('credit_ledger').insert({
          clinic_id: clinicId, amount: credits, balance_after: newBalance, reason: 'purchase',
        })
      }
    }

    if (event.action === 'failed') {
      await supabase.rpc('emit_notification', {
        p_event_type: 'payment.failed',
        p_title: 'Payment failed',
        p_body: 'A GoCardless payment has failed',
        p_target_roles: ['admin', 'super_admin'],
      })
    }

    return jsonResponse({ received: true })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
