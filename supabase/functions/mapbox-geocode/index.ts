import { jsonResponse, corsHeaders } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const token = Deno.env.get('MAPBOX_ACCESS_TOKEN')
    const body = await req.json().catch(() => ({})) as { query?: string }
    const query = body.query?.trim()

    if (!token) {
      return jsonResponse({ configured: false, message: 'Set MAPBOX_ACCESS_TOKEN' })
    }
    if (!query) {
      return jsonResponse({ error: 'query required' }, 400)
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1&country=AU,US`
    const res = await fetch(url)
    const data = await res.json()
    const feature = data.features?.[0]

    if (!feature) {
      return jsonResponse({ error: 'No results' }, 404)
    }

    const [lng, lat] = feature.center as [number, number]
    return jsonResponse({ lat, lng, place_name: feature.place_name as string })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
