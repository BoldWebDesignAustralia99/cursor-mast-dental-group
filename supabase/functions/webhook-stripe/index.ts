import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'
import Stripe from 'https://esm.sh/stripe@14?target=deno'

// Stripe deposit webhook (§3.3)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
    const sig = req.headers.get('stripe-signature')!
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')!)

    const supabase = getServiceClient()

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const bookingId = session.metadata?.booking_id
      if (bookingId) {
        await supabase.from('bookings').update({
          deposit_status: 'paid',
          stripe_payment_intent_id: session.payment_intent as string,
        }).eq('id', bookingId)

        await supabase.rpc('emit_notification', {
          p_event_type: 'deposit.paid',
          p_title: 'Deposit paid',
          p_body: 'Patient deposit confirmed',
          p_entity_type: 'booking',
          p_entity_id: bookingId,
        })
      }
    }

    return jsonResponse({ received: true })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 400)
  }
})
