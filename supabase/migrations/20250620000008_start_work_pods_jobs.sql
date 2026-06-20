-- Phase 8: Start Work allocation, lead locking, sales pods, job queue, event backbone
-- Mast Dental Platform — enterprise scalability foundation

DO $$ BEGIN
  CREATE TYPE public.queue_type AS ENUM ('frontline', 'reactivation');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'dead_letter');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Sales pods (hard RLS isolation boundary)
CREATE TABLE IF NOT EXISTS public.staff_pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  manager_id UUID REFERENCES public.staff_profiles(id),
  queue_type public.queue_type NOT NULL DEFAULT 'frontline',
  region TEXT NOT NULL DEFAULT 'US',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_pod_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES public.staff_pods(id) ON DELETE CASCADE,
  staff_profile_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  is_manager BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pod_id, staff_profile_id)
);

ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS pod_id UUID REFERENCES public.staff_pods(id),
  ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/New_York';

CREATE INDEX IF NOT EXISTS idx_staff_pod_members_staff ON public.staff_pod_members(staff_profile_id);
CREATE INDEX IF NOT EXISTS idx_leads_assignment ON public.leads(assigned_to, stage, next_callback_at);

-- Lead locks: one rep at a time, heartbeat ~2 min expiry
CREATE TABLE IF NOT EXISTS public.lead_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  staff_profile_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  queue_type public.queue_type NOT NULL DEFAULT 'frontline',
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  release_reason TEXT,
  UNIQUE (lead_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_locks_active ON public.lead_locks(lead_id)
  WHERE released_at IS NULL;

-- Extend leads for reactivation queue + DND
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS do_not_disturb BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS do_not_disturb_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_reactivation BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reactivation_clinic_id UUID REFERENCES public.clinics(id),
  ADD COLUMN IF NOT EXISTS max_call_attempts INT NOT NULL DEFAULT 8;

-- Queue config (admin — reps never browse this list directly)
CREATE TABLE IF NOT EXISTS public.queue_tab_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  queue_type public.queue_type NOT NULL DEFAULT 'frontline',
  filter_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority_band INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Durable job queue (pg-based worker layer)
CREATE TABLE IF NOT EXISTS public.job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT UNIQUE,
  status public.job_status NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_queue_pending ON public.job_queue(scheduled_for)
  WHERE status = 'pending';

-- Domain event log (event-driven architecture backbone)
CREATE TABLE IF NOT EXISTS public.domain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID REFERENCES public.staff_profiles(id),
  idempotency_key TEXT UNIQUE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domain_events_unprocessed ON public.domain_events(created_at)
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_domain_events_entity ON public.domain_events(entity_type, entity_id, created_at DESC);

-- Helper: current user's pod id
CREATE OR REPLACE FUNCTION public.current_pod_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pod_id FROM staff_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_same_pod(p_staff_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_pod_members m1
    JOIN staff_pod_members m2 ON m2.pod_id = m1.pod_id
    WHERE m1.staff_profile_id = current_staff_profile_id()
      AND m2.staff_profile_id = p_staff_id
  ) OR p_staff_id = current_staff_profile_id()
  OR has_permission('team.manage');
$$;

-- Expire stale locks (>2 min without heartbeat)
CREATE OR REPLACE FUNCTION public.expire_stale_lead_locks()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  UPDATE lead_locks
  SET released_at = now(), release_reason = 'heartbeat_expired'
  WHERE released_at IS NULL AND heartbeat_at < now() - interval '2 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Acquire or refresh lead lock
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

-- Heartbeat for active lock
CREATE OR REPLACE FUNCTION public.heartbeat_lead_lock(p_lead_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_staff UUID := current_staff_profile_id();
BEGIN
  UPDATE lead_locks SET heartbeat_at = now()
  WHERE lead_id = p_lead_id AND staff_profile_id = v_staff AND released_at IS NULL;
  RETURN FOUND;
END;
$$;

-- Release lock cleanly
CREATE OR REPLACE FUNCTION public.release_lead_lock(
  p_lead_id UUID,
  p_reason TEXT DEFAULT 'manual'
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_staff UUID := current_staff_profile_id();
BEGIN
  UPDATE lead_locks
  SET released_at = now(), release_reason = p_reason
  WHERE lead_id = p_lead_id AND staff_profile_id = v_staff AND released_at IS NULL;
  IF FOUND THEN
    PERFORM log_activity('lead.unlocked', 'lead', p_lead_id,
      jsonb_build_object('staff_id', v_staff, 'reason', p_reason));
  END IF;
  RETURN FOUND;
END;
$$;

-- Start Work: allocate next single lead (no queue browsing for reps)
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

  -- Priority 1: due callbacks assigned to this rep
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
    AND (l.assigned_to = v_staff OR l.assigned_to IS NULL)
  ORDER BY l.next_callback_at ASC
  LIMIT 1;

  IF FOUND THEN
    v_reason := 'callback_due';
  ELSE
    -- Priority 2: new leads (stickiness: prefer assigned_to = this rep)
    SELECT l.* INTO v_lead
    FROM leads l
    LEFT JOIN lead_locks ll ON ll.lead_id = l.id AND ll.released_at IS NULL
    WHERE ll.id IS NULL
      AND l.do_not_disturb = false
      AND l.call_count < v_max_attempts
      AND (p_queue_type = 'reactivation' AND l.is_reactivation = true
           OR p_queue_type = 'frontline' AND l.is_reactivation = false)
      AND l.stage IN ('new', 'contacted')
      AND (l.assigned_to = v_staff OR l.assigned_to IS NULL)
    ORDER BY
      CASE WHEN l.assigned_to = v_staff THEN 0 ELSE 1 END,
      l.created_at ASC
    LIMIT 1;

    IF FOUND THEN
      v_reason := CASE WHEN v_lead.stage = 'new' THEN 'new_lead' ELSE 'standard' END;
    ELSE
      -- Priority 3: older standard leads
      SELECT l.* INTO v_lead
      FROM leads l
      LEFT JOIN lead_locks ll ON ll.lead_id = l.id AND ll.released_at IS NULL
      WHERE ll.id IS NULL
        AND l.do_not_disturb = false
        AND l.call_count < v_max_attempts
        AND (p_queue_type = 'reactivation' AND l.is_reactivation = true
             OR p_queue_type = 'frontline' AND l.is_reactivation = false)
        AND l.stage NOT IN ('booked', 'lost', 'dnc')
        AND (l.assigned_to = v_staff OR l.assigned_to IS NULL)
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

  -- Assign ownership stickiness
  IF v_lead.assigned_to IS NULL THEN
    UPDATE leads SET assigned_to = v_staff, updated_at = now() WHERE id = v_lead.id;
  END IF;

  lead_id := v_lead.id;
  lock_acquired := acquire_lead_lock(v_lead.id, p_queue_type);
  allocation_reason := v_reason;
  RETURN NEXT;
END;
$$;

-- Enqueue background job (idempotent)
CREATE OR REPLACE FUNCTION public.enqueue_job(
  p_job_type TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_idempotency_key TEXT DEFAULT NULL,
  p_scheduled_for TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_id FROM job_queue WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN RETURN v_id; END IF;
  END IF;

  INSERT INTO job_queue (job_type, payload, idempotency_key, scheduled_for)
  VALUES (p_job_type, p_payload, p_idempotency_key, p_scheduled_for)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Emit domain event (idempotent)
CREATE OR REPLACE FUNCTION public.emit_domain_event(
  p_event_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_id FROM domain_events WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN RETURN v_id; END IF;
  END IF;

  INSERT INTO domain_events (event_type, entity_type, entity_id, payload, actor_id, idempotency_key)
  VALUES (p_event_type, p_entity_type, p_entity_id, p_payload, current_staff_profile_id(), p_idempotency_key)
  RETURNING id INTO v_id;

  PERFORM enqueue_job('process_domain_event', jsonb_build_object('event_id', v_id),
    'event:' || v_id::TEXT);
  RETURN v_id;
END;
$$;

-- RLS
ALTER TABLE public.staff_pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_pod_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_tab_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_pods_select ON public.staff_pods FOR SELECT TO authenticated
  USING (has_permission('team.view') OR id = current_pod_id());

CREATE POLICY staff_pods_manage ON public.staff_pods FOR ALL TO authenticated
  USING (has_permission('team.manage')) WITH CHECK (has_permission('team.manage'));

CREATE POLICY pod_members_select ON public.staff_pod_members FOR SELECT TO authenticated
  USING (staff_profile_id = current_staff_profile_id() OR is_same_pod(staff_profile_id));

CREATE POLICY lead_locks_select ON public.lead_locks FOR SELECT TO authenticated
  USING (staff_profile_id = current_staff_profile_id() OR has_permission('team.manage'));

CREATE POLICY queue_configs_select ON public.queue_tab_configs FOR SELECT TO authenticated
  USING (has_permission('leads.manage') OR has_permission('calls.queue.view'));

CREATE POLICY queue_configs_manage ON public.queue_tab_configs FOR ALL TO authenticated
  USING (has_permission('leads.manage')) WITH CHECK (has_permission('leads.manage'));

CREATE POLICY domain_events_select ON public.domain_events FOR SELECT TO authenticated
  USING (has_permission('team.manage'));

GRANT EXECUTE ON FUNCTION public.acquire_lead_lock TO authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_lead_lock TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_lead_lock TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_work TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_job TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.emit_domain_event TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_lead_locks TO service_role;

-- Seed settings
INSERT INTO public.app_settings (key, value, value_type, label, description, category) VALUES
  ('lead.max_call_attempts', '8', 'number', 'Max call attempts', 'Stop calling after this many attempts', 'leads'),
  ('lead.lock_heartbeat_seconds', '120', 'number', 'Lock heartbeat timeout', 'Auto-expire lead lock after seconds without heartbeat', 'leads')
ON CONFLICT (key) DO NOTHING;

-- Seed default frontline pod
INSERT INTO public.staff_pods (id, name, queue_type, region) VALUES
  ('d0000001-0000-4000-8000-000000000001', 'Frontline Sales — US East', 'frontline', 'US'),
  ('d0000001-0000-4000-8000-000000000002', 'Reactivation — US East', 'reactivation', 'US')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.queue_tab_configs (name, queue_type, filter_rules, priority_band, sort_order) VALUES
  ('New leads', 'frontline', '{"stage": ["new"]}', 1, 1),
  ('Callbacks due', 'frontline', '{"has_callback": true}', 2, 2),
  ('Standard follow-up', 'frontline', '{"stage": ["contacted", "callback", "qualified"]}', 3, 3),
  ('Reactivation pool', 'reactivation', '{"is_reactivation": true}', 1, 1)
ON CONFLICT DO NOTHING;

-- Enhanced call flow stages per spec (7 stages)
DELETE FROM public.call_flow_stages;
INSERT INTO public.call_flow_stages (name, time_range, script_content, sort_order) VALUES
  ('Open', '0–2 min', 'Hi {{first_name}}, this is {{rep_name}} from Mast Dental Group. You recently enquired about {{enquiry_type}} — is now a good time to chat?', 1),
  ('Discovery', '2–10 min', 'Tell me what''s been going on with your teeth and what you''re hoping to achieve. I''ll map your mouth as we talk.', 2),
  ('Educate', '10–18 min', 'At the consult we do a cone-beam 3D scan, OPG, smile design, and colour match — and show you a preview on screen. That''s normally $395.', 3),
  ('Finance Check', '18–22 min', 'Let''s check eligibility: household income, any bankruptcies or debt agreements, and citizenship status. Then we''ll discuss funding options.', 4),
  ('Sell the Dentist', '22–26 min', '{{clinic_name}} has {{dentist_name}} — a specialist in implant dentistry with years of experience in All-on-X cases.', 5),
  ('Take Deposit', '26–28 min', 'To secure your consult we take a $75 holding deposit. I can take payment now or send you a secure link via SMS.', 6),
  ('Book', '28–30 min', 'Let me find the nearest clinic to {{suburb}} and get you booked in with the best available dentist.', 7);
