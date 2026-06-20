import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'

// Xero OAuth — returns authorization URL; callback exchanges code for tokens (§HR)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const clientId = Deno.env.get('XERO_CLIENT_ID')
    const redirectUri = Deno.env.get('XERO_REDIRECT_URI') ?? `${Deno.env.get('APP_URL')}/team/payroll`
    const url = new URL(req.url)

    if (!clientId) {
      return jsonResponse({ configured: false, message: 'Set XERO_CLIENT_ID and XERO_CLIENT_SECRET' })
    }

    const code = url.searchParams.get('code') ?? (await req.json().catch(() => ({})) as { code?: string }).code

    if (!code) {
      const authUrl = new URL('https://login.xero.com/identity/connect/authorize')
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('client_id', clientId)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('scope', 'openid profile email accounting.settings payroll.employees')
      authUrl.searchParams.set('state', crypto.randomUUID())
      return jsonResponse({ configured: true, auth_url: authUrl.toString() })
    }

    const clientSecret = Deno.env.get('XERO_CLIENT_SECRET')
    if (!clientSecret) return jsonResponse({ error: 'XERO_CLIENT_SECRET not set' }, 503)

    const tokenRes = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokenRes.ok) return jsonResponse({ error: tokens }, tokenRes.status)

    const supabase = getServiceClient()
    await supabase.from('integration_configs').upsert({
      integration_key: 'xero',
      label: 'Xero',
      is_active: true,
      config: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Date.now() + (tokens.expires_in ?? 1800) * 1000,
      },
    }, { onConflict: 'integration_key' })

    return jsonResponse({ ok: true, connected: true })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
