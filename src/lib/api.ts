const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''

export async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<T>
}

export const api = {
  classifyBooking: (bookingId: string, transcript: string) =>
    invokeFunction('classify-booking', { booking_id: bookingId, transcript }),
  aiCallNotes: (communicationId: string, transcript: string) =>
    invokeFunction('ai-call-notes', { communication_id: communicationId, transcript }),
  createDepositLink: (bookingId: string, amountCents: number, phone: string) =>
    invokeFunction<{ url: string }>('create-deposit-link', {
      booking_id: bookingId,
      amount_cents: amountCents,
      phone,
    }),
  aiClinicReply: (communicationId: string, context: string) =>
    invokeFunction<{ draft: string }>('ai-clinic-reply', { communication_id: communicationId, context }),
  aiAdminChat: (question: string) =>
    invokeFunction<{ answer: string }>('ai-admin-chat', { question }),
  twilioToken: (identity: string) =>
    invokeFunction<{ configured: boolean; token?: string; message?: string }>('twilio-token', { identity }),
  processJobs: (batch = 10) =>
    invokeFunction<{ processed: number }>(`process-jobs?batch=${batch}`, {}),
  executeAutomation: (payload: { run_id: string; automation_id: string; payload?: Record<string, unknown> }) =>
    invokeFunction('execute-automation', payload),
  geocodeAddress: (query: string) =>
    invokeFunction<{ lat: number; lng: number; place_name: string } | { configured: false }>('mapbox-geocode', { query }),
  syncPms: (clinicId: string) =>
    invokeFunction<{ ok: boolean }>('sync-pms', { clinic_id: clinicId }),
  xeroPushPayroll: (payrollRunId: string) =>
    invokeFunction<{ ok: boolean }>('xero-push-payroll', { payroll_run_id: payrollRunId }),
  elevenLabsPracticeCall: (script: string) =>
    invokeFunction<{ audio_url?: string; configured?: boolean }>('elevenlabs-practice-call', { script }),
}
