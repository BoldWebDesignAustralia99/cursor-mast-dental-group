-- Phase 12: Intelligence layer — copilot cues, post-call pipeline, coaching fetch

CREATE OR REPLACE FUNCTION public.get_copilot_cue_cards(p_keywords TEXT[] DEFAULT '{}')
RETURNS TABLE (id UUID, title TEXT, content TEXT, sort_order INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.title, c.content, c.sort_order
  FROM copilot_cue_cards c
  WHERE c.is_active
    AND (
      cardinality(p_keywords) = 0
      OR EXISTS (
        SELECT 1 FROM unnest(c.trigger_keywords) kw
        WHERE EXISTS (
          SELECT 1 FROM unnest(p_keywords) pk
          WHERE lower(pk) LIKE '%' || lower(kw) || '%'
        )
      )
    )
  ORDER BY c.sort_order
  LIMIT 10;
$$;

CREATE OR REPLACE FUNCTION public.get_coaching_sessions(p_staff_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID, staff_id UUID, full_name TEXT, summary TEXT, checklist JSONB, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT cs.id, cs.staff_id, sp.full_name, cs.summary, cs.checklist, cs.created_at
  FROM coaching_sessions cs
  JOIN staff_profiles sp ON sp.id = cs.staff_id
  WHERE (
    has_permission('team.manage')
    OR cs.staff_id = current_staff_profile_id()
  )
  AND (p_staff_id IS NULL OR cs.staff_id = p_staff_id)
  ORDER BY cs.created_at DESC
  LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION public.end_call_log(
  p_call_log_id UUID,
  p_transcript TEXT DEFAULT NULL,
  p_duration_seconds INT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE call_logs SET
    status = 'completed',
    ended_at = now(),
    transcript = COALESCE(p_transcript, transcript),
    duration_seconds = COALESCE(p_duration_seconds, duration_seconds)
  WHERE id = p_call_log_id
    AND (staff_profile_id = current_staff_profile_id() OR has_permission('team.manage'));
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_call_grades_queue()
RETURNS TABLE (
  id UUID, staff_name TEXT, score INT, feedback TEXT, status TEXT, created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cg.id, sp.full_name, cg.score, cg.feedback, cg.status, cg.created_at
  FROM call_grades cg
  JOIN staff_profiles sp ON sp.id = cg.staff_id
  WHERE has_permission('team.manage')
    AND cg.status IN ('disputed', 'flagged', 'auto')
  ORDER BY cg.created_at DESC
  LIMIT 30;
$$;

GRANT EXECUTE ON FUNCTION public.get_copilot_cue_cards TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coaching_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_call_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_call_grades_queue TO authenticated;

INSERT INTO public.copilot_cue_cards (id, trigger_keywords, title, content, sort_order) VALUES
  ('e1000001-0000-4000-8000-000000000001', ARRAY['super', 'superannuation', 'fund'], 'Superannuation funding', 'Many patients access super for major dental work. I can explain the release process and what documentation they need.', 1),
  ('e1000001-0000-4000-8000-000000000002', ARRAY['pain', 'hurt', 'sedation', 'nervous', 'anxious'], 'Pain & sedation', 'We offer IV sedation and most patients report minimal discomfort. The consult includes a full pain-management plan.', 2),
  ('e1000001-0000-4000-8000-000000000003', ARRAY['price', 'cost', 'expensive', 'afford', 'payment'], 'Price anchor', 'The free consult includes 3D scan and written treatment plan — $395 value. Payment plans and super options available.', 3),
  ('e1000001-0000-4000-8000-000000000004', ARRAY['husband', 'wife', 'partner', 'decision'], 'Decision maker', 'Offer to include their partner on a follow-up call or book a joint consult so everyone hears the plan together.', 4),
  ('e1000001-0000-4000-8000-000000000005', ARRAY['implant', 'all-on', 'denture', 'missing'], 'Implant education', 'All-on-X replaces a full arch on 4–6 implants. Most patients wish they had done it sooner.', 5)
ON CONFLICT (id) DO NOTHING;
