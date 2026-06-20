-- Phase 9: RLS hardening, workflow engine, domain RPCs, seed routing data
-- Mast Dental Platform — completes gaps across all domains

-- ─── RLS on previously exposed tables ───
ALTER TABLE public.clinic_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_cue_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pms_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_dispositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_capacity_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY clinic_packages_select ON public.clinic_packages FOR SELECT TO authenticated
  USING (has_permission('clinics.billing.manage') OR clinic_id = ANY(get_my_clinic_ids()));
CREATE POLICY custom_fields_select ON public.custom_field_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY call_grades_select ON public.call_grades FOR SELECT TO authenticated
  USING (has_permission('team.view'));
CREATE POLICY coaching_select ON public.coaching_sessions FOR SELECT TO authenticated
  USING (staff_id = current_staff_profile_id() OR has_permission('team.manage'));
CREATE POLICY community_comments_select ON public.community_comments FOR SELECT TO authenticated
  USING (has_permission('team.view'));
CREATE POLICY commission_select ON public.commission_ledger FOR SELECT TO authenticated
  USING (staff_id = current_staff_profile_id() OR has_permission('payroll.view'));
CREATE POLICY notif_prefs_select ON public.notification_preferences FOR SELECT TO authenticated
  USING (staff_profile_id = current_staff_profile_id());
CREATE POLICY notif_prefs_manage ON public.notification_preferences FOR ALL TO authenticated
  USING (staff_profile_id = current_staff_profile_id()) WITH CHECK (staff_profile_id = current_staff_profile_id());
CREATE POLICY cue_cards_select ON public.copilot_cue_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY pms_sync_select ON public.pms_sync_log FOR SELECT TO authenticated
  USING (has_permission('integrations.manage') OR clinic_id = ANY(get_my_clinic_ids()));
CREATE POLICY dispositions_select ON public.call_dispositions FOR SELECT TO authenticated USING (true);
CREATE POLICY proposal_templates_select ON public.proposal_templates FOR SELECT TO authenticated
  USING (has_permission('clinics.view'));
CREATE POLICY onboarding_select ON public.onboarding_checklist_items FOR SELECT TO authenticated
  USING (has_permission('clinics.view') OR clinic_id = ANY(get_my_clinic_ids()));
CREATE POLICY scorecards_select ON public.grading_scorecards FOR SELECT TO authenticated USING (true);
CREATE POLICY payroll_runs_select ON public.payroll_runs FOR SELECT TO authenticated
  USING (has_permission('payroll.view'));
CREATE POLICY capacity_cache_select ON public.clinic_capacity_cache FOR SELECT TO authenticated
  USING (has_permission('clinics.view') OR clinic_id = ANY(get_my_clinic_ids()));

-- ─── Workflow & Automation Engine ───
DO $$ BEGIN
  CREATE TYPE public.automation_trigger_type AS ENUM (
    'booking_created', 'appointment_approaching', 'no_show_recorded',
    'booking_showed', 'booking_purchased', 'clinic_status_changed',
    'credit_low', 'callback_due', 'scheduled', 'lead_created'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.automation_step_type AS ENUM (
    'sms', 'email', 'notification', 'wait', 'condition', 'task'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.workflow_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.marketing_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type public.automation_trigger_type NOT NULL,
  trigger_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.workflow_status NOT NULL DEFAULT 'draft',
  version INT NOT NULL DEFAULT 1,
  created_by UUID REFERENCES public.staff_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.marketing_automations(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_type public.automation_step_type NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  template_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (automation_id, step_order)
);

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.marketing_automations(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  idempotency_key TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS public.automation_step_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.automation_steps(id),
  status TEXT NOT NULL DEFAULT 'pending',
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_step_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY automations_select ON public.marketing_automations FOR SELECT TO authenticated
  USING (has_permission('settings.view') OR has_permission('team.manage'));
CREATE POLICY automations_manage ON public.marketing_automations FOR ALL TO authenticated
  USING (has_permission('settings.edit')) WITH CHECK (has_permission('settings.edit'));
CREATE POLICY automation_steps_select ON public.automation_steps FOR SELECT TO authenticated
  USING (has_permission('settings.view'));
CREATE POLICY automation_runs_select ON public.automation_runs FOR SELECT TO authenticated
  USING (has_permission('settings.view') OR has_permission('team.manage'));

-- ─── Domain RPCs ───

CREATE OR REPLACE FUNCTION public.get_booking_detail(p_booking_id UUID)
RETURNS TABLE (
  id UUID, lead_id UUID, clinic_id UUID, clinic_name TEXT,
  patient_first_name TEXT, patient_last_name TEXT, patient_phone TEXT,
  scheduled_start TIMESTAMPTZ, scheduled_end TIMESTAMPTZ,
  status public.booking_status, outcome public.booking_outcome,
  deposit_status public.deposit_status, rep_notes TEXT, ai_summary TEXT,
  classification TEXT, classification_reasoning TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.lead_id, b.clinic_id, c.name,
    b.patient_first_name, b.patient_last_name, b.patient_phone,
    b.scheduled_start, b.scheduled_end, b.status, b.outcome,
    b.deposit_status, b.rep_notes, b.ai_summary,
    bc.classification, bc.ai_reasoning
  FROM bookings b
  JOIN clinics c ON c.id = b.clinic_id
  LEFT JOIN LATERAL (
    SELECT classification, ai_reasoning FROM booking_classifications
    WHERE booking_id = b.id ORDER BY created_at DESC LIMIT 1
  ) bc ON true
  WHERE b.id = p_booking_id;
END; $$;

CREATE OR REPLACE FUNCTION public.update_booking_outcome(
  p_booking_id UUID,
  p_outcome public.booking_outcome
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_clinic UUID; v_balance INT;
BEGIN
  IF NOT has_permission('bookings.create') AND NOT has_permission('clinics.view') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE bookings SET outcome = p_outcome, updated_at = now() WHERE id = p_booking_id;

  IF p_outcome = 'no_show' THEN
    SELECT clinic_id INTO v_clinic FROM bookings WHERE id = p_booking_id;
    SELECT credit_balance INTO v_balance FROM clinics WHERE id = v_clinic FOR UPDATE;
    UPDATE clinics SET credit_balance = credit_balance + 1 WHERE id = v_clinic;
    INSERT INTO credit_ledger (clinic_id, amount, balance_after, reason, booking_id)
    VALUES (v_clinic, 1, v_balance + 1, 'no_show_refund', p_booking_id);
    PERFORM emit_domain_event('no_show_recorded', 'booking', p_booking_id,
      jsonb_build_object('clinic_id', v_clinic), 'no_show:' || p_booking_id::TEXT);
  ELSIF p_outcome = 'showed' THEN
    PERFORM emit_domain_event('booking_showed', 'booking', p_booking_id, '{}'::jsonb,
      'showed:' || p_booking_id::TEXT);
  ELSIF p_outcome = 'purchased' THEN
    PERFORM emit_domain_event('booking_purchased', 'booking', p_booking_id, '{}'::jsonb,
      'purchased:' || p_booking_id::TEXT);
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids UUID[])
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  UPDATE notifications SET is_read = true
  WHERE id = ANY(p_ids) AND recipient_id = current_staff_profile_id();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.get_clinic_onboarding(p_clinic_id UUID)
RETURNS TABLE (item_key TEXT, label TEXT, is_complete BOOLEAN, completed_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT item_key, label, is_complete, completed_at
  FROM onboarding_checklist_items WHERE clinic_id = p_clinic_id ORDER BY item_key;
$$;

CREATE OR REPLACE FUNCTION public.get_clinic_ledger(p_clinic_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (id UUID, amount INT, balance_after INT, reason TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, amount, balance_after, reason, created_at
  FROM credit_ledger WHERE clinic_id = p_clinic_id ORDER BY created_at DESC LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_routing_matrix()
RETURNS TABLE (
  zone_id UUID, zone_name TEXT, clinic_id UUID, clinic_name TEXT,
  weight INT, cap_per_period INT, period_count INT, credit_balance INT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM routing_matrix_view;
$$;

CREATE OR REPLACE FUNCTION public.get_tasks_board()
RETURNS TABLE (
  id UUID, title TEXT, description TEXT, status TEXT,
  assigned_to UUID, assignee_name TEXT, due_at TIMESTAMPTZ, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.title, t.description, t.status, t.assigned_to, sp.full_name, t.due_at, t.created_at
  FROM tasks t LEFT JOIN staff_profiles sp ON sp.id = t.assigned_to
  WHERE t.assigned_to = current_staff_profile_id() OR has_permission('team.view')
  ORDER BY t.due_at NULLS LAST, t.created_at DESC LIMIT 100;
END; $$;

CREATE OR REPLACE FUNCTION public.get_timesheets_recent()
RETURNS TABLE (
  id UUID, staff_name TEXT, clock_in TIMESTAMPTZ, clock_out TIMESTAMPTZ, status TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT ts.id, sp.full_name, ts.clock_in, ts.clock_out, ts.status
  FROM timesheets ts JOIN staff_profiles sp ON sp.id = ts.staff_id
  WHERE ts.staff_id = current_staff_profile_id() OR has_permission('team.manage')
  ORDER BY ts.clock_in DESC LIMIT 50;
END; $$;

CREATE OR REPLACE FUNCTION public.get_leave_requests_list()
RETURNS TABLE (
  id UUID, staff_name TEXT, leave_type TEXT, start_date DATE, end_date DATE, status TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT lr.id, sp.full_name, lr.leave_type, lr.start_date, lr.end_date, lr.status
  FROM leave_requests lr JOIN staff_profiles sp ON sp.id = lr.staff_id
  WHERE lr.staff_id = current_staff_profile_id() OR has_permission('team.manage')
  ORDER BY lr.created_at DESC LIMIT 50;
END; $$;

CREATE OR REPLACE FUNCTION public.get_training_journeys_list()
RETURNS TABLE (
  journey_id UUID, journey_name TEXT, total_stages INT, completed_stages INT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT j.id, j.name,
    (SELECT COUNT(*)::INT FROM training_stages WHERE journey_id = j.id),
    (SELECT COUNT(*)::INT FROM training_progress tp
     JOIN training_stages ts ON ts.id = tp.stage_id
     WHERE ts.journey_id = j.id AND tp.staff_id = current_staff_profile_id() AND tp.status = 'completed')
  FROM training_journeys j WHERE j.is_active;
$$;

CREATE OR REPLACE FUNCTION public.get_classification_reviews(p_status TEXT DEFAULT 'pending')
RETURNS TABLE (
  id UUID, booking_id UUID, patient_name TEXT, proposed_classification TEXT,
  status TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT cr.id, cr.booking_id,
    b.patient_first_name || ' ' || b.patient_last_name,
    cr.proposed_classification, cr.status, cr.created_at
  FROM classification_reviews cr
  JOIN bookings b ON b.id = cr.booking_id
  WHERE (p_status = 'all' OR cr.status = p_status)
  ORDER BY cr.created_at DESC LIMIT 50;
END; $$;

CREATE OR REPLACE FUNCTION public.get_rep_leaderboard()
RETURNS TABLE (
  staff_id UUID, full_name TEXT, bookings_month BIGINT, shows_month BIGINT, avg_grade NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM rep_performance_view ORDER BY bookings_month DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.get_clinic_comms_inbox()
RETURNS TABLE (
  id UUID, clinic_id UUID, clinic_name TEXT, body TEXT, channel TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.clinic_id, cl.name, COALESCE(c.body, c.transcript_summary, ''), c.channel::TEXT, c.created_at
  FROM communications c
  JOIN clinics cl ON cl.id = c.clinic_id
  WHERE c.clinic_id IS NOT NULL AND c.direction = 'inbound'
  ORDER BY c.created_at DESC LIMIT 50;
END; $$;

CREATE OR REPLACE FUNCTION public.get_portal_bookings(p_clinic_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID, patient_name TEXT, scheduled_start TIMESTAMPTZ, status TEXT, outcome TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.patient_first_name || ' ' || b.patient_last_name, b.scheduled_start,
    b.status::TEXT, b.outcome::TEXT
  FROM bookings b
  WHERE (p_clinic_id IS NULL OR b.clinic_id = p_clinic_id)
    AND (b.clinic_id = ANY(get_my_clinic_ids()) OR has_permission('bookings.view'))
  ORDER BY b.scheduled_start DESC LIMIT 50;
END; $$;

CREATE OR REPLACE FUNCTION public.process_next_job()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_job RECORD; v_result JSONB;
BEGIN
  SELECT * INTO v_job FROM job_queue
  WHERE status = 'pending' AND scheduled_for <= now()
  ORDER BY scheduled_for LIMIT 1 FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN RETURN jsonb_build_object('processed', false); END IF;

  UPDATE job_queue SET status = 'processing', started_at = now(), attempts = attempts + 1
  WHERE id = v_job.id;

  IF v_job.job_type = 'process_domain_event' THEN
    UPDATE domain_events SET processed_at = now()
    WHERE id = (v_job.payload->>'event_id')::UUID;
    v_result := jsonb_build_object('event_id', v_job.payload->>'event_id');
  ELSE
    v_result := jsonb_build_object('job_type', v_job.job_type);
  END IF;

  UPDATE job_queue SET status = 'completed', completed_at = now() WHERE id = v_job.id;
  RETURN jsonb_build_object('processed', true, 'job_id', v_job.id, 'result', v_result);
END; $$;

GRANT EXECUTE ON FUNCTION public.get_booking_detail TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_booking_outcome TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clinic_onboarding TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clinic_ledger TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_routing_matrix TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tasks_board TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_timesheets_recent TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leave_requests_list TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_training_journeys_list TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_classification_reviews TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rep_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clinic_comms_inbox TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_portal_bookings TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_next_job TO service_role;

-- Seed routing zones
INSERT INTO public.routing_zones (id, name, country, suburbs) VALUES
  ('e0000001-0000-4000-8000-000000000001', 'North Brisbane', 'AU', ARRAY['Chermside', 'North Lakes', 'Redcliffe']),
  ('e0000001-0000-4000-8000-000000000002', 'South Brisbane', 'AU', ARRAY['Moorooka', 'Caboolture', 'Brisbane'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.routing_zone_clinics (zone_id, clinic_id, weight, cap_per_period, period_count) VALUES
  ('e0000001-0000-4000-8000-000000000001', 'a0000001-0000-4000-8000-000000000002', 2, 15, 5),
  ('e0000001-0000-4000-8000-000000000001', 'a0000001-0000-4000-8000-000000000003', 3, 20, 8),
  ('e0000001-0000-4000-8000-000000000002', 'a0000001-0000-4000-8000-000000000001', 5, 30, 12)
ON CONFLICT DO NOTHING;

-- Seed starter workflows (all comms through automation engine)
INSERT INTO public.marketing_automations (id, name, trigger_type, status, trigger_conditions) VALUES
  ('f0000001-0000-4000-8000-000000000001', 'Low credit alert', 'credit_low', 'active', '[{"field":"clinic.credit_balance","op":"lt","value":5}]'),
  ('f0000001-0000-4000-8000-000000000002', 'Booking confirmation', 'booking_created', 'active', '[]'),
  ('f0000001-0000-4000-8000-000000000003', 'No-show follow-up', 'no_show_recorded', 'active', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.automation_steps (automation_id, step_order, step_type, config, template_body) VALUES
  ('f0000001-0000-4000-8000-000000000001', 1, 'email', '{"to":"clinic_admin"}', 'Your credit balance is running low. Top up to keep receiving bookings.'),
  ('f0000001-0000-4000-8000-000000000002', 1, 'sms', '{"to":"patient"}', 'Hi {{first_name}}, your consult is confirmed for {{appointment_time}} at {{clinic_name}}.'),
  ('f0000001-0000-4000-8000-000000000003', 1, 'sms', '{"to":"patient"}', 'Hi {{first_name}}, we missed you at your appointment. Would you like to reschedule?')
ON CONFLICT DO NOTHING;

-- Permission for workflows
INSERT INTO public.permission_keys (key, module, label, description, sort_order) VALUES
  ('workflows.view', 'workflows', 'View workflows', 'View automation workflows', 1),
  ('workflows.build', 'workflows', 'Build workflows', 'Create and edit automation workflows', 2)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT 'super_admin'::public.user_role, key, true FROM public.permission_keys
WHERE key IN ('workflows.view', 'workflows.build')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT 'admin'::public.user_role, key, true FROM public.permission_keys
WHERE key IN ('workflows.view', 'workflows.build')
ON CONFLICT DO NOTHING;
