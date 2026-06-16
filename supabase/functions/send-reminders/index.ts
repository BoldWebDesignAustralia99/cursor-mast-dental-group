import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'

// Booking reminders — SMS + email (§3.2)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const supabase = getServiceClient()
    const { data: settings } = await supabase.from('app_settings').select('value').eq('key', 'booking.reminder_hours').single()
    const hours: number[] = (settings?.value as number[]) ?? [48, 2]

    for (const h of hours) {
      const windowStart = new Date(Date.now() + h * 3600000 - 1800000)
      const windowEnd = new Date(Date.now() + h * 3600000 + 1800000)

      const { data: bookings } = await supabase.from('bookings')
        .select('id, patient_phone, patient_first_name, scheduled_start')
        .gte('scheduled_start', windowStart.toISOString())
        .lte('scheduled_start', windowEnd.toISOString())
        .in('status', ['scheduled', 'confirmed'])

      for (const b of bookings ?? []) {
        await supabase.from('communications').insert({
          channel: 'sms', direction: 'outbound', body: `Reminder: your appointment is in ${h} hours.`,
          booking_id: b.id, metadata: { reminder_hours: h },
        })
        // Twilio/Resend send would happen here with env credentials
      }
    }

    return jsonResponse({ ok: true })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
