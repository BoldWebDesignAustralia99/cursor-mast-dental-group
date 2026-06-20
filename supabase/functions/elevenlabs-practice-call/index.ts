import { jsonResponse, corsHeaders } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY')
    const body = await req.json().catch(() => ({})) as { script?: string; voice_id?: string }
    const script = body.script?.trim()

    if (!apiKey) {
      return jsonResponse({ configured: false, message: 'Set ELEVENLABS_API_KEY' })
    }
    if (!script) return jsonResponse({ error: 'script required' }, 400)

    const voiceId = body.voice_id ?? Deno.env.get('ELEVENLABS_VOICE_ID') ?? '21m00Tcm4TlvDq8ikWAM'
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: script,
        model_id: 'eleven_monolingual_v1',
      }),
    })

    if (!res.ok) {
      return jsonResponse({ error: await res.text() }, res.status)
    }

    const buffer = await res.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    return jsonResponse({ ok: true, audio_base64: base64, content_type: 'audio/mpeg' })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
