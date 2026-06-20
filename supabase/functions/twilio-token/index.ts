import { jsonResponse, corsHeaders } from '../_shared/supabase.ts'

function base64url(input: Uint8Array | string): string {
  const str = typeof input === 'string' ? input : String.fromCharCode(...input)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT', cty: 'twilio-fpa;v=1' }
  const enc = new TextEncoder()
  const headerB64 = base64url(JSON.stringify(header))
  const payloadB64 = base64url(JSON.stringify(payload))
  const data = `${headerB64}.${payloadB64}`
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return `${data}.${base64url(new Uint8Array(sig))}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID_AU') ?? Deno.env.get('TWILIO_ACCOUNT_SID_US')
    const apiKey = Deno.env.get('TWILIO_API_KEY')
    const apiSecret = Deno.env.get('TWILIO_API_SECRET')
    const twimlAppSid = Deno.env.get('TWILIO_TWIML_APP_SID')

    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
      return jsonResponse({
        configured: false,
        message: 'Set TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_TWIML_APP_SID',
      })
    }

    const body = await req.json().catch(() => ({})) as { identity?: string }
    const identity = body.identity ?? 'sales-rep'
    const now = Math.floor(Date.now() / 1000)

    const token = await signJwt(
      {
        jti: `${apiKey}-${now}`,
        iss: apiKey,
        sub: accountSid,
        exp: now + 3600,
        grants: {
          identity,
          voice: {
            outgoing: { application_sid: twimlAppSid },
            incoming: { allow: true },
          },
        },
      },
      apiSecret,
    )

    return jsonResponse({ configured: true, identity, token })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
