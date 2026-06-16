import { getServiceClient, jsonResponse, corsHeaders } from '../_shared/supabase.ts'
import { callAI } from '../_shared/ai.ts'

// Daily coaching job (§6)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const supabase = getServiceClient()
    const { data: reps } = await supabase.from('staff_profiles').select('id, full_name').eq('role', 'sales_rep').eq('is_active', true)

    for (const rep of reps ?? []) {
      const { data: calls } = await supabase.from('communications')
        .select('transcript_summary').eq('staff_id', rep.id).eq('channel', 'phone')
        .gte('created_at', new Date(Date.now() - 86400000).toISOString()).limit(10)

      if (!calls?.length) continue

      const { content } = await callAI({
        useCase: 'coaching',
        systemPrompt: 'Generate personalized coaching feedback and a manager checklist for this sales rep based on recent calls.',
        userPrompt: JSON.stringify(calls),
        temperature: 0.7,
      })

      await supabase.from('coaching_sessions').insert({
        staff_id: rep.id,
        summary: content,
        checklist: [],
      })

      await supabase.rpc('emit_notification', {
        p_event_type: 'coaching.ready',
        p_title: 'Coaching feedback ready',
        p_body: `Daily coaching summary for ${rep.full_name}`,
        p_target_roles: ['manager'],
      })
    }

    return jsonResponse({ processed: reps?.length ?? 0 })
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
