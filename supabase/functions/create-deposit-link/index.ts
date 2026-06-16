import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'

// Create Stripe checkout link for deposit
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const { booking_id, amount_cents, phone } = await req.json()
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) return jsonResponse({ error: 'Stripe not configured' }, 503)

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'success_url': `${Deno.env.get('APP_URL')}/bookings?paid=1`,
        'cancel_url': `${Deno.env.get('APP_URL')}/bookings?paid=0`,
        'line_items[0][price_data][currency]': 'aud',
        'line_items[0][price_data][product_data][name]': 'Appointment deposit',
        'line_items[0][price_data][unit_amount]': String(amount_cents),
        'line_items[0][quantity]': '1',
        'metadata[booking_id]': booking_id,
        'customer_creation': 'always',
      }),
    })

    const session = await res.json()
    const supabase = getServiceClient()
    await supabase.from('bookings').update({ deposit_status: 'pending' }).eq('id', booking_id)

    // Send SMS via Twilio if configured
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID_AU')
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN_AU')
    const twilioFrom = Deno.env.get('TWILIO_FROM_AU')
    if (twilioSid && twilioToken && twilioFrom && phone) {
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          From: twilioFrom,
          Body: `Pay your appointment deposit here: ${session.url}`,
        }),
      })
    }

    return jsonResponse({ url: session.url, session_id: session.id })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
