import { jsonResponse, corsHeaders } from '../_shared/supabase.ts'
import { callAI } from '../_shared/ai.ts'

// Clinic comms inbox AI draft (§2.5, §6)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const { communication_id, context } = await req.json()
    const { content } = await callAI({
      useCase: 'clinic_reply',
      systemPrompt: 'Draft a professional reply to this clinic message. Be concise and helpful.',
      userPrompt: context,
      temperature: 0.5,
    })
    return jsonResponse({ draft: content, communication_id })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
