import { jsonResponse, corsHeaders } from '../_shared/supabase.ts'

// Twilio Voice token stub — returns config status; full WebRTC when credentials set
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID_AU') ?? Deno.env.get('TWILIO_ACCOUNT_SID_US')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN_AU') ?? Deno.env.get('TWILIO_AUTH_TOKEN_US')
    const apiKey = Deno.env.get('TWILIO_API_KEY')
    const apiSecret = Deno.env.get('TWILIO_API_SECRET')

    if (!accountSid || !authToken || !apiKey || !apiSecret) {
      return jsonResponse({
        configured: false,
        message: 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_API_KEY, TWILIO_API_SECRET in Edge Function secrets',
      })
    }

    const body = await req.json().catch(() => ({})) as { identity?: string }
    const identity = body.identity ?? 'sales-rep'

    // Production: use twilio npm/jwt to generate AccessToken with VoiceGrant
    return jsonResponse({
      configured: true,
      identity,
      token: 'stub-token-configure-twilio-jwt',
      message: 'Twilio credentials detected. Replace stub with AccessToken generation for live calls.',
    })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
