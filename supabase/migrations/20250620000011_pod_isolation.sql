-- Phase 11: Enforce sales pod isolation across allocation, queue RPCs, and lead access

-- Pod-visible lead check (assignment + same-pod membership)
CREATE OR REPLACE FUNCTION public.can_access_lead(p_lead_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    has_permission('team.manage')
    OR has_permission('leads.manage')
    OR EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = p_lead_id
        AND (
          l.assigned_to IS NULL
          OR l.assigned_to = current_staff_profile_id()
          OR is_same_pod(l.assigned_to)
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.lead_visible_in_pod(p_assigned_to UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    has_permission('leads.manage')
    OR has_permission('team.manage')
    OR p_assigned_to IS NULL
    OR p_assigned_to = current_staff_profile_id()
    OR is_same_pod(p_assigned_to);
$$;

-- Acquire lock only if caller may access the lead
CREATE OR REPLACE FUNCTION public.acquire_lead_lock(
  p_lead_id UUID,
  p_queue_type public.queue_type DEFAULT 'frontline'
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_staff UUID := current_staff_profile_id();
  v_existing RECORD;
BEGIN
  IF v_staff IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT has_permission('calls.make') THEN RAISE EXCEPTION 'Permission denied'; END IF;
  IF NOT can_access_lead(p_lead_id) THEN RAISE EXCEPTION 'Lead not in your pod'; END IF;

  PERFORM expire_stale_lead_locks();

  SELECT * INTO v_existing FROM lead_locks
  WHERE lead_id = p_lead_id AND released_at IS NULL FOR UPDATE;

  IF FOUND THEN
    IF v_existing.staff_profile_id = v_staff THEN
      UPDATE lead_locks SET heartbeat_at = now() WHERE id = v_existing.id;
      RETURN true;
    END IF;
    RETURN false;
  END IF;

  INSERT INTO lead_locks (lead_id, staff_profile_id, queue_type)
  VALUES (p_lead_id, v_staff, p_queue_type);

  PERFORM log_activity('lead.locked', 'lead', p_lead_id,
    jsonb_build_object('staff_id', v_staff, 'queue_type', p_queue_type));
  RETURN true;
END;
$$;

-- Start Work: pod-scoped allocation
CREATE OR REPLACE FUNCTION public.start_work(
  p_queue_type public.queue_type DEFAULT 'frontline'
)
RETURNS TABLE (
  lead_id UUID,
  lock_acquired BOOLEAN,
  allocation_reason TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_staff UUID := current_staff_profile_id();
  v_lead RECORD;
  v_reason TEXT;
  v_max_attempts INT;
  v_region TEXT;
BEGIN
  IF v_staff IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT has_permission('calls.make') THEN RAISE EXCEPTION 'Permission denied'; END IF;

  PERFORM expire_stale_lead_locks();

  SELECT region INTO v_region FROM staff_profiles WHERE id = v_staff;
  SELECT COALESCE((value)::INT, 8) INTO v_max_attempts
  FROM app_settings WHERE key = 'lead.max_call_attempts';

  SELECT l.* INTO v_lead
  FROM leads l
  LEFT JOIN lead_locks ll ON ll.lead_id = l.id AND ll.released_at IS NULL
  WHERE ll.id IS NULL
    AND l.do_not_disturb = false
    AND l.call_count < v_max_attempts
    AND (p_queue_type = 'reactivation' AND l.is_reactivation = true
         OR p_queue_type = 'frontline' AND l.is_reactivation = false)
    AND l.stage NOT IN ('booked', 'lost', 'dnc')
    AND (l.country = v_region OR l.state IS NOT NULL)
    AND l.next_callback_at IS NOT NULL
    AND l.next_callback_at <= now()
    AND lead_visible_in_pod(l.assigned_to)
  ORDER BY
    CASE WHEN l.assigned_to = v_staff THEN 0 ELSE 1 END,
    l.next_callback_at ASC
  LIMIT 1;

  IF FOUND THEN
    v_reason := 'callback_due';
  ELSE
    SELECT l.* INTO v_lead
    FROM leads l
    LEFT JOIN lead_locks ll ON ll.lead_id = l.id AND ll.released_at IS NULL
    WHERE ll.id IS NULL
      AND l.do_not_disturb = false
      AND l.call_count < v_max_attempts
      AND (p_queue_type = 'reactivation' AND l.is_reactivation = true
           OR p_queue_type = 'frontline' AND l.is_reactivation = false)
      AND l.stage IN ('new', 'contacted')
      AND lead_visible_in_pod(l.assigned_to)
    ORDER BY
      CASE WHEN l.assigned_to = v_staff THEN 0 ELSE 1 END,
      l.created_at ASC
    LIMIT 1;

    IF FOUND THEN
      v_reason := CASE WHEN v_lead.stage = 'new' THEN 'new_lead' ELSE 'standard' END;
    ELSE
      SELECT l.* INTO v_lead
      FROM leads l
      LEFT JOIN lead_locks ll ON ll.lead_id = l.id AND ll.released_at IS NULL
      WHERE ll.id IS NULL
        AND l.do_not_disturb = false
        AND l.call_count < v_max_attempts
        AND (p_queue_type = 'reactivation' AND l.is_reactivation = true
             OR p_queue_type = 'frontline' AND l.is_reactivation = false)
        AND l.stage NOT IN ('booked', 'lost', 'dnc')
        AND lead_visible_in_pod(l.assigned_to)
      ORDER BY
        CASE WHEN l.assigned_to = v_staff THEN 0 ELSE 1 END,
        l.last_contact_at NULLS FIRST,
        l.created_at ASC
      LIMIT 1;

      IF FOUND THEN v_reason := 'standard_older'; END IF;
    END IF;
  END IF;

  IF NOT FOUND THEN
    lead_id := NULL;
    lock_acquired := false;
    allocation_reason := 'no_leads_available';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_lead.assigned_to IS NULL THEN
    UPDATE leads SET assigned_to = v_staff, updated_at = now() WHERE id = v_lead.id;
  END IF;

  lead_id := v_lead.id;
  lock_acquired := acquire_lead_lock(v_lead.id, p_queue_type);
  allocation_reason := v_reason;
  RETURN NEXT;
END;
$$;

-- Pod-scoped call queue (managers see all; reps see pod only)
CREATE OR REPLACE FUNCTION public.get_call_queue(
  p_tab_id UUID DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 50
)
RETURNS TABLE (
  id UUID, first_name TEXT, last_name TEXT, phone TEXT, suburb TEXT,
  stage public.lead_stage, call_count INT, last_contact_at TIMESTAMPTZ,
  next_callback_at TIMESTAMPTZ, treatment_interest TEXT, assigned_to UUID,
  created_at TIMESTAMPTZ, total_count BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_offset INT; v_total BIGINT;
BEGIN
  IF NOT has_permission('calls.queue.view') AND NOT has_permission('leads.manage') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_offset := (GREATEST(p_page, 1) - 1) * LEAST(p_page_size, 50);

  SELECT COUNT(*) INTO v_total FROM leads l
  WHERE l.stage NOT IN ('booked', 'lost', 'dnc')
    AND lead_visible_in_pod(l.assigned_to);

  RETURN QUERY
  SELECT l.id, l.first_name, l.last_name, l.phone, l.suburb, l.stage,
    l.call_count, l.last_contact_at, l.next_callback_at,
    l.treatment_interest, l.assigned_to, l.created_at, v_total
  FROM leads l
  WHERE l.stage NOT IN ('booked', 'lost', 'dnc')
    AND lead_visible_in_pod(l.assigned_to)
  ORDER BY
    CASE WHEN l.next_callback_at IS NOT NULL AND l.next_callback_at <= now() THEN 0 ELSE 1 END,
    l.next_callback_at NULLS LAST,
    l.created_at ASC
  LIMIT LEAST(p_page_size, 50) OFFSET v_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_leads_list(
  p_search TEXT DEFAULT NULL,
  p_stage TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 50
)
RETURNS TABLE (
  id UUID, first_name TEXT, last_name TEXT, phone TEXT, email TEXT,
  suburb TEXT, stage public.lead_stage, source TEXT, assigned_to UUID,
  call_count INT, created_at TIMESTAMPTZ, total_count BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_offset INT; v_total BIGINT;
BEGIN
  IF NOT has_permission('leads.view') THEN RAISE EXCEPTION 'Permission denied'; END IF;

  v_offset := (GREATEST(p_page, 1) - 1) * LEAST(p_page_size, 50);

  SELECT COUNT(*) INTO v_total FROM leads l
  WHERE (p_stage IS NULL OR l.stage::TEXT = p_stage)
    AND (p_search IS NULL OR l.first_name ILIKE '%' || p_search || '%'
      OR l.last_name ILIKE '%' || p_search || '%' OR l.phone ILIKE '%' || p_search || '%')
    AND lead_visible_in_pod(l.assigned_to);

  RETURN QUERY
  SELECT l.id, l.first_name, l.last_name, l.phone, l.email, l.suburb, l.stage,
    l.source, l.assigned_to, l.call_count, l.created_at, v_total
  FROM leads l
  WHERE (p_stage IS NULL OR l.stage::TEXT = p_stage)
    AND (p_search IS NULL OR l.first_name ILIKE '%' || p_search || '%'
      OR l.last_name ILIKE '%' || p_search || '%' OR l.phone ILIKE '%' || p_search || '%')
    AND lead_visible_in_pod(l.assigned_to)
  ORDER BY l.created_at DESC
  LIMIT LEAST(p_page_size, 50) OFFSET v_offset;
END;
$$;

-- Pod management RPCs
CREATE OR REPLACE FUNCTION public.get_sales_pods()
RETURNS TABLE (
  id UUID, name TEXT, queue_type TEXT, region TEXT, member_count BIGINT, is_active BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.queue_type::TEXT, p.region, COUNT(m.id), p.is_active
  FROM staff_pods p
  LEFT JOIN staff_pod_members m ON m.pod_id = p.id
  WHERE has_permission('team.manage') OR p.id = current_pod_id()
  GROUP BY p.id, p.name, p.queue_type, p.region, p.is_active
  ORDER BY p.name;
$$;

CREATE OR REPLACE FUNCTION public.get_pod_members(p_pod_id UUID)
RETURNS TABLE (
  staff_profile_id UUID, full_name TEXT, email TEXT, is_manager BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.staff_profile_id, sp.full_name, sp.email, m.is_manager
  FROM staff_pod_members m
  JOIN staff_profiles sp ON sp.id = m.staff_profile_id
  WHERE m.pod_id = p_pod_id
    AND (has_permission('team.manage') OR p_pod_id = current_pod_id());
$$;

GRANT EXECUTE ON FUNCTION public.can_access_lead TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_pods TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pod_members TO authenticated;

-- Assign all active sales reps to default frontline pod
UPDATE staff_profiles
SET pod_id = 'd0000001-0000-4000-8000-000000000001'
WHERE role = 'sales_rep' AND pod_id IS NULL;

INSERT INTO staff_pod_members (pod_id, staff_profile_id)
SELECT 'd0000001-0000-4000-8000-000000000001', id
FROM staff_profiles WHERE role = 'sales_rep' AND is_active
ON CONFLICT (pod_id, staff_profile_id) DO NOTHING;
