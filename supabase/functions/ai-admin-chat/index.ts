import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'
import { callAI } from '../_shared/ai.ts'

// Admin AI chat over business data (§6)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const { question } = await req.json()
    const supabase = getServiceClient()

    const [leads, bookings, clinics] = await Promise.all([
      supabase.from('leads').select('id, stage').limit(100),
      supabase.from('bookings').select('id, status, outcome').limit(100),
      supabase.from('clinics').select('id, name, credit_balance, stage').limit(50),
    ])

    const context = JSON.stringify({
      lead_count: leads.data?.length,
      leads_by_stage: leads.data,
      bookings: bookings.data,
      clinics: clinics.data,
    })

    const { content } = await callAI({
      useCase: 'admin_chat',
      systemPrompt: 'You are an internal assistant for a dental implant booking business. Answer questions using the provided data. Be concise.',
      userPrompt: `Data: ${context}\n\nQuestion: ${question}`,
      temperature: 0.4,
    })

    return jsonResponse({ answer: content })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
