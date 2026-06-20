-- Spec completion: RPCs and RLS for features that had DB schema but no UI wiring

-- ─── Classification QA ───
CREATE OR REPLACE FUNCTION public.resolve_classification_review(
  p_review_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking UUID;
  v_clinic UUID;
  v_balance INT;
BEGIN
  IF NOT has_permission('bookings.view') AND NOT has_permission('team.manage') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT booking_id INTO v_booking FROM classification_reviews WHERE id = p_review_id AND status = 'pending';
  IF v_booking IS NULL THEN RAISE EXCEPTION 'Review not found or already resolved'; END IF;

  UPDATE classification_reviews
  SET status = p_decision, reviewed_by = current_staff_profile_id(), review_notes = p_notes
  WHERE id = p_review_id;

  IF p_decision = 'accepted' THEN
    SELECT clinic_id INTO v_clinic FROM bookings WHERE id = v_booking;
    SELECT credit_balance INTO v_balance FROM clinics WHERE id = v_clinic FOR UPDATE;
    UPDATE clinics SET credit_balance = credit_balance + 1 WHERE id = v_clinic;
    INSERT INTO credit_ledger (clinic_id, amount, balance_after, reason, booking_id)
    VALUES (v_clinic, 1, v_balance + 1, 'classification_refund', v_booking);
  END IF;
END; $$;

-- ─── Clinic onboarding ───
CREATE OR REPLACE FUNCTION public.toggle_clinic_onboarding_item(
  p_clinic_id UUID,
  p_item_key TEXT,
  p_complete BOOLEAN
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_permission('clinics.manage') THEN RAISE EXCEPTION 'Permission denied'; END IF;
  UPDATE onboarding_checklist_items
  SET is_complete = p_complete,
      completed_at = CASE WHEN p_complete THEN now() ELSE NULL END,
      completed_by = CASE WHEN p_complete THEN current_staff_profile_id() ELSE NULL END
  WHERE clinic_id = p_clinic_id AND item_key = p_item_key;
END; $$;

-- ─── Timesheets ───
CREATE OR REPLACE FUNCTION public.timesheet_clock_in()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_staff UUID;
BEGIN
  v_staff := current_staff_profile_id();
  IF EXISTS (SELECT 1 FROM timesheets WHERE staff_id = v_staff AND clock_out IS NULL) THEN
    RAISE EXCEPTION 'Already clocked in';
  END IF;
  INSERT INTO timesheets (staff_id, clock_in, status) VALUES (v_staff, now(), 'pending') RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.timesheet_clock_out()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_staff UUID;
BEGIN
  v_staff := current_staff_profile_id();
  UPDATE timesheets SET clock_out = now(), status = 'pending'
  WHERE staff_id = v_staff AND clock_out IS NULL
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'No active timesheet'; END IF;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_active_timesheet()
RETURNS TABLE (id UUID, clock_in TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.clock_in FROM timesheets t
  WHERE t.staff_id = current_staff_profile_id() AND t.clock_out IS NULL
  LIMIT 1;
$$;

-- ─── Leave ───
CREATE OR REPLACE FUNCTION public.create_leave_request(
  p_leave_type TEXT,
  p_start_date DATE,
  p_end_date DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO leave_requests (staff_id, leave_type, start_date, end_date, notes, status)
  VALUES (current_staff_profile_id(), p_leave_type, p_start_date, p_end_date, p_notes, 'pending')
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- ─── Community ───
CREATE OR REPLACE FUNCTION public.create_community_post(p_body TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT has_permission('team.view') THEN RAISE EXCEPTION 'Permission denied'; END IF;
  INSERT INTO community_posts (author_id, body) VALUES (current_staff_profile_id(), p_body) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- ─── Internal messages ───
CREATE OR REPLACE FUNCTION public.get_message_channels()
RETURNS TABLE (id UUID, name TEXT, is_group BOOLEAN, member_count INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT mc.id, COALESCE(mc.name, 'Direct'), mc.is_group, cardinality(mc.member_ids)
  FROM message_channels mc
  WHERE current_staff_profile_id() = ANY(mc.member_ids) OR mc.is_group
  ORDER BY mc.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_channel_messages(p_channel_id UUID)
RETURNS TABLE (id UUID, sender_name TEXT, body TEXT, created_at TIMESTAMPTZ, is_mine BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT im.id, sp.full_name, im.body, im.created_at, im.sender_id = current_staff_profile_id()
  FROM internal_messages im
  JOIN staff_profiles sp ON sp.id = im.sender_id
  WHERE im.channel_id = p_channel_id
  ORDER BY im.created_at ASC
  LIMIT 100;
$$;

CREATE OR REPLACE FUNCTION public.send_internal_message(p_channel_id UUID, p_body TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO internal_messages (sender_id, channel_id, body)
  VALUES (current_staff_profile_id(), p_channel_id, p_body) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- Seed a default team channel if none exists
INSERT INTO public.message_channels (id, name, is_group, member_ids)
SELECT 'd0000002-0000-4000-8000-000000000001', 'Sales team', true,
  ARRAY(SELECT id FROM staff_profiles WHERE is_active AND role IN ('super_admin','admin','manager','sales_rep'))
WHERE NOT EXISTS (SELECT 1 FROM message_channels LIMIT 1);

-- ─── Call grades ───
CREATE OR REPLACE FUNCTION public.resolve_call_grade(
  p_grade_id UUID,
  p_decision TEXT,
  p_new_score INT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_permission('team.manage') AND NOT has_permission('training.manage') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  UPDATE call_grades
  SET status = p_decision,
      score = COALESCE(p_new_score, score)
  WHERE id = p_grade_id;
END; $$;

-- ─── Training ───
CREATE OR REPLACE FUNCTION public.complete_training_stage(p_stage_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO training_progress (staff_id, stage_id, status, completed_at)
  VALUES (current_staff_profile_id(), p_stage_id, 'completed', now())
  ON CONFLICT (staff_id, stage_id) DO UPDATE
  SET status = 'completed', completed_at = now();
END; $$;

CREATE OR REPLACE FUNCTION public.create_training_stage(
  p_journey_id UUID,
  p_name TEXT,
  p_stage_type TEXT DEFAULT 'course'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_order INT;
BEGIN
  IF NOT has_permission('training.manage') THEN RAISE EXCEPTION 'Permission denied'; END IF;
  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_order FROM training_stages WHERE journey_id = p_journey_id;
  INSERT INTO training_stages (journey_id, name, stage_type, sort_order)
  VALUES (p_journey_id, p_name, p_stage_type, v_order) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_training_stages(p_journey_id UUID)
RETURNS TABLE (id UUID, name TEXT, stage_type TEXT, sort_order INT, status TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ts.id, ts.name, ts.stage_type, ts.sort_order,
    COALESCE(tp.status, 'not_started')
  FROM training_stages ts
  LEFT JOIN training_progress tp ON tp.stage_id = ts.id AND tp.staff_id = current_staff_profile_id()
  WHERE ts.journey_id = p_journey_id
  ORDER BY ts.sort_order;
$$;

-- ─── Proposals & contacts ───
CREATE OR REPLACE FUNCTION public.create_clinic_proposal(
  p_clinic_id UUID,
  p_title TEXT,
  p_total_cents INT DEFAULT 0
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT has_permission('clinics.manage') THEN RAISE EXCEPTION 'Permission denied'; END IF;
  INSERT INTO proposals (clinic_id, title, total_cents, created_by, status)
  VALUES (p_clinic_id, p_title, p_total_cents, current_staff_profile_id(), 'draft')
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_clinic_proposals(p_clinic_id UUID)
RETURNS TABLE (id UUID, title TEXT, status TEXT, total_cents INT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, title, status, total_cents, created_at FROM proposals
  WHERE clinic_id = p_clinic_id ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.upsert_clinic_contact(
  p_clinic_id UUID,
  p_full_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT has_permission('clinics.manage') THEN RAISE EXCEPTION 'Permission denied'; END IF;
  INSERT INTO clinic_contacts (clinic_id, full_name, email, phone, role)
  VALUES (p_clinic_id, p_full_name, p_email, p_phone, p_role) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_clinic_contacts(p_clinic_id UUID)
RETURNS TABLE (id UUID, full_name TEXT, email TEXT, phone TEXT, role TEXT, is_primary BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, full_name, email, phone, role, is_primary FROM clinic_contacts
  WHERE clinic_id = p_clinic_id ORDER BY is_primary DESC, full_name;
$$;

-- ─── Routing matrix edit ───
CREATE OR REPLACE FUNCTION public.update_routing_weight(
  p_zone_id UUID,
  p_clinic_id UUID,
  p_weight INT,
  p_cap INT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_permission('leads.manage') THEN RAISE EXCEPTION 'Permission denied'; END IF;
  UPDATE routing_zone_clinics
  SET weight = p_weight,
      cap_per_period = COALESCE(p_cap, cap_per_period)
  WHERE zone_id = p_zone_id AND clinic_id = p_clinic_id;
END; $$;

-- Extend get_routing_matrix to include IDs for editing
CREATE OR REPLACE FUNCTION public.get_routing_matrix()
RETURNS TABLE (
  zone_id UUID, zone_name TEXT, clinic_id UUID, clinic_name TEXT,
  weight INT, cap_per_period INT, period_count INT, credit_balance INT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM routing_matrix_view;
$$;

-- ─── Clinic comms reply ───
CREATE OR REPLACE FUNCTION public.send_clinic_comms_reply(
  p_clinic_id UUID,
  p_body TEXT,
  p_channel TEXT DEFAULT 'sms'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT has_permission('clinics.comms.view') AND NOT has_permission('clinics.manage') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  INSERT INTO communications (clinic_id, channel, direction, body, staff_id)
  VALUES (p_clinic_id, p_channel::comm_channel, 'outbound', p_body, current_staff_profile_id())
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- ─── Workflows: create automation + step ───
CREATE OR REPLACE FUNCTION public.create_workflow(
  p_name TEXT,
  p_trigger_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT has_permission('workflows.build') AND NOT has_permission('settings.edit') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  INSERT INTO marketing_automations (name, trigger_type, description, status)
  VALUES (p_name, p_trigger_type, p_description, 'draft') RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.add_workflow_step(
  p_automation_id UUID,
  p_step_type TEXT,
  p_template_body TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_order INT;
BEGIN
  IF NOT has_permission('workflows.build') AND NOT has_permission('settings.edit') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  SELECT COALESCE(MAX(step_order), 0) + 1 INTO v_order FROM automation_steps WHERE automation_id = p_automation_id;
  INSERT INTO automation_steps (automation_id, step_order, step_type, template_body)
  VALUES (p_automation_id, v_order, p_step_type, p_template_body) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- ─── RLS additions ───
CREATE POLICY proposals_manage ON public.proposals FOR ALL TO authenticated
  USING (has_permission('clinics.manage')) WITH CHECK (has_permission('clinics.manage'));
CREATE POLICY clinic_contacts_manage ON public.clinic_contacts FOR ALL TO authenticated
  USING (has_permission('clinics.manage')) WITH CHECK (has_permission('clinics.manage'));
CREATE POLICY onboarding_update ON public.onboarding_checklist_items FOR UPDATE TO authenticated
  USING (has_permission('clinics.manage'));
CREATE POLICY classification_reviews_update ON public.classification_reviews FOR UPDATE TO authenticated
  USING (has_permission('bookings.view') OR has_permission('team.manage'));
CREATE POLICY call_grades_update ON public.call_grades FOR UPDATE TO authenticated
  USING (has_permission('team.manage') OR has_permission('training.manage'));
CREATE POLICY leave_insert ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (staff_id = current_staff_profile_id());
CREATE POLICY timesheets_insert ON public.timesheets FOR INSERT TO authenticated
  WITH CHECK (staff_id = current_staff_profile_id());
CREATE POLICY timesheets_update ON public.timesheets FOR UPDATE TO authenticated
  USING (staff_id = current_staff_profile_id() OR has_permission('team.manage'));
CREATE POLICY community_posts_insert ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (author_id = current_staff_profile_id());
CREATE POLICY internal_messages_select ON public.internal_messages FOR SELECT TO authenticated
  USING (has_permission('team.view'));
CREATE POLICY internal_messages_insert ON public.internal_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = current_staff_profile_id());
CREATE POLICY message_channels_select ON public.message_channels FOR SELECT TO authenticated
  USING (has_permission('team.view'));
CREATE POLICY training_stages_manage ON public.training_stages FOR ALL TO authenticated
  USING (has_permission('training.manage')) WITH CHECK (has_permission('training.manage'));
CREATE POLICY training_progress_manage ON public.training_progress FOR ALL TO authenticated
  USING (staff_id = current_staff_profile_id() OR has_permission('training.manage'))
  WITH CHECK (staff_id = current_staff_profile_id() OR has_permission('training.manage'));

DROP POLICY IF EXISTS comms_insert ON public.communications;
CREATE POLICY comms_insert ON public.communications FOR INSERT TO authenticated
  WITH CHECK (
    has_permission('calls.make') OR has_permission('leads.manage')
    OR has_permission('clinics.manage') OR has_permission('clinics.comms.view')
  );

GRANT EXECUTE ON FUNCTION public.resolve_classification_review TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_clinic_onboarding_item TO authenticated;
GRANT EXECUTE ON FUNCTION public.timesheet_clock_in TO authenticated;
GRANT EXECUTE ON FUNCTION public.timesheet_clock_out TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_timesheet TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_leave_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_community_post TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_message_channels TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_channel_messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_internal_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_call_grade TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_training_stage TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_training_stage TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_training_stages TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_clinic_proposal TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clinic_proposals TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_clinic_contact TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clinic_contacts TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_routing_weight TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_clinic_comms_reply TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_workflow TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_workflow_step TO authenticated;
