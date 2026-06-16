-- Phase 3-4: Leads, communications, bookings, routing, callbacks
CREATE EXTENSION IF NOT EXISTS btree_gist;
-- Mast Dental Group

DO $$ BEGIN
  CREATE TYPE public.lead_stage AS ENUM (
    'new', 'contacted', 'callback', 'qualified', 'booked', 'lost', 'dnc'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM (
    'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_outcome AS ENUM (
    'showed', 'no_show', 'purchased', 'cancelled', 'clinic_caused', 'pending'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.comm_channel AS ENUM (
    'phone', 'sms', 'email', 'portal_message', 'internal_note'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.comm_direction AS ENUM ('inbound', 'outbound', 'internal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.classification_source AS ENUM (
    'transcript', 'clinic_data', 'keyword', 'manual', 'ai_retry'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.deposit_status AS ENUM (
    'none', 'pending', 'paid', 'refunded', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Leads
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  suburb TEXT,
  state TEXT,
  postcode TEXT,
  country TEXT NOT NULL DEFAULT 'AU',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  source TEXT NOT NULL DEFAULT 'facebook',
  stage public.lead_stage NOT NULL DEFAULT 'new',
  assigned_to UUID REFERENCES public.staff_profiles(id),
  assigned_clinic_id UUID REFERENCES public.clinics(id),
  treatment_interest TEXT,
  funding_type TEXT,
  decision_maker TEXT,
  notes TEXT,
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  call_count INT NOT NULL DEFAULT 0,
  last_contact_at TIMESTAMPTZ,
  next_callback_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email) WHERE email IS NOT NULL AND email != '';
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to, stage);
CREATE INDEX IF NOT EXISTS idx_leads_callback ON public.leads(next_callback_at) WHERE next_callback_at IS NOT NULL;

-- Unified communications
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel public.comm_channel NOT NULL,
  direction public.comm_direction NOT NULL,
  body TEXT,
  recording_url TEXT,
  transcript TEXT,
  transcript_summary TEXT,
  suggested_disposition TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  booking_id UUID,
  staff_id UUID REFERENCES public.staff_profiles(id),
  duration_seconds INT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comms_lead ON public.communications(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comms_clinic ON public.communications(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comms_timeline ON public.communications(created_at DESC);

-- Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id),
  assigned_rep_id UUID REFERENCES public.staff_profiles(id),
  patient_first_name TEXT NOT NULL,
  patient_last_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_email TEXT,
  patient_suburb TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'scheduled',
  outcome public.booking_outcome NOT NULL DEFAULT 'pending',
  rep_notes TEXT,
  clinic_notes TEXT,
  ai_summary TEXT,
  clinic_brief TEXT,
  deposit_status public.deposit_status NOT NULL DEFAULT 'none',
  deposit_amount_cents INT,
  stripe_payment_intent_id TEXT,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    practitioner_id WITH =,
    tstzrange(scheduled_start, scheduled_end) WITH &&
  ) WHERE (status NOT IN ('cancelled'))
);

ALTER TABLE public.communications
  ADD CONSTRAINT comms_booking_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_clinic ON public.bookings(clinic_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_bookings_lead ON public.bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled ON public.bookings(scheduled_start);

-- Slot generation RPC (requires bookings table)
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_clinic_id UUID,
  p_date DATE,
  p_practitioner_id UUID DEFAULT NULL
)
RETURNS TABLE (
  slot_start TIMESTAMPTZ,
  slot_end TIMESTAMPTZ,
  practitioner_id UUID,
  practitioner_name TEXT,
  is_senior BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz TEXT;
  v_weekday INT;
  v_region TEXT;
BEGIN
  SELECT timezone, country INTO v_tz, v_region FROM clinics WHERE id = p_clinic_id;
  v_weekday := EXTRACT(DOW FROM p_date)::INT;

  IF EXISTS (SELECT 1 FROM clinic_closed_dates WHERE clinic_id = p_clinic_id AND closed_date = p_date) THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public_holidays WHERE region = v_region AND holiday_date = p_date) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH practitioners_filtered AS (
    SELECT p.id, p.full_name, p.is_senior, p.meeting_duration_minutes, p.buffer_minutes
    FROM practitioners p
    WHERE p.clinic_id = p_clinic_id AND p.is_active
      AND (p_practitioner_id IS NULL OR p.id = p_practitioner_id)
  ),
  windows AS (
    SELECT pf.id AS pid, pf.full_name, pf.is_senior,
      pf.meeting_duration_minutes AS dur, pf.buffer_minutes AS buf,
      COALESCE(CASE WHEN o.is_unavailable THEN NULL WHEN o.start_time IS NOT NULL THEN o.start_time ELSE ws.start_time END, ws.start_time) AS win_start,
      COALESCE(CASE WHEN o.is_unavailable THEN NULL WHEN o.end_time IS NOT NULL THEN o.end_time ELSE ws.end_time END, ws.end_time) AS win_end
    FROM practitioners_filtered pf
    LEFT JOIN staff_weekly_schedules ws ON ws.practitioner_id = pf.id AND ws.clinic_id = p_clinic_id AND ws.weekday = v_weekday AND ws.is_available
    LEFT JOIN staff_schedule_overrides o ON o.practitioner_id = pf.id AND o.clinic_id = p_clinic_id AND o.override_date = p_date
    WHERE ws.id IS NOT NULL OR o.id IS NOT NULL
  ),
  slots AS (
    SELECT w.pid, w.full_name, w.is_senior, w.dur, w.buf,
      generate_series((p_date + w.win_start) AT TIME ZONE v_tz, (p_date + w.win_end) AT TIME ZONE v_tz - (w.dur || ' minutes')::INTERVAL, ((w.dur + w.buf) || ' minutes')::INTERVAL) AS slot_start
    FROM windows w WHERE w.win_start IS NOT NULL AND w.win_end IS NOT NULL
  )
  SELECT s.slot_start, s.slot_start + (s.dur || ' minutes')::INTERVAL, s.pid, s.full_name, s.is_senior
  FROM slots s
  WHERE NOT EXISTS (
    SELECT 1 FROM bookings b WHERE b.practitioner_id = s.pid AND b.status NOT IN ('cancelled')
      AND b.scheduled_start < s.slot_start + (s.dur || ' minutes')::INTERVAL AND b.scheduled_end > s.slot_start
  )
  ORDER BY s.slot_start;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_available_dates(
  p_clinic_id UUID, p_start_date DATE, p_end_date DATE
)
RETURNS TABLE (available_date DATE, slot_count INT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE d DATE; cnt INT;
BEGIN
  FOR d IN SELECT generate_series(p_start_date, p_end_date, '1 day'::INTERVAL)::DATE LOOP
    SELECT COUNT(*)::INT INTO cnt FROM get_available_slots(p_clinic_id, d);
    IF cnt > 0 THEN available_date := d; slot_count := cnt; RETURN NEXT; END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_slots TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_dates TO authenticated;

-- Booking classifications
CREATE TABLE IF NOT EXISTS public.booking_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  classification TEXT NOT NULL,
  source public.classification_source NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  ai_reasoning TEXT,
  created_by UUID REFERENCES public.staff_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classifications_booking ON public.booking_classifications(booking_id);

-- Callbacks
CREATE TABLE IF NOT EXISTS public.callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.staff_profiles(id),
  due_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_callbacks_due ON public.callbacks(assigned_to, due_at) WHERE completed_at IS NULL;

-- Routing: geographic zones
CREATE TABLE IF NOT EXISTS public.routing_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'AU',
  postcodes TEXT[] NOT NULL DEFAULT '{}',
  suburbs TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.routing_zone_clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.routing_zones(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  weight INT NOT NULL DEFAULT 1,
  cap_per_period INT,
  period_count INT NOT NULL DEFAULT 0,
  UNIQUE (zone_id, clinic_id)
);

-- Call queue tabs (admin-configurable)
CREATE TABLE IF NOT EXISTS public.call_queue_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  filter_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Call flow stages (for lead record script stepper)
CREATE TABLE IF NOT EXISTS public.call_flow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  time_range TEXT,
  script_content TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Paginated call queue view RPC
CREATE OR REPLACE FUNCTION public.get_call_queue(
  p_tab_id UUID DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  suburb TEXT,
  stage public.lead_stage,
  call_count INT,
  last_contact_at TIMESTAMPTZ,
  next_callback_at TIMESTAMPTZ,
  treatment_interest TEXT,
  assigned_to UUID,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
  v_total BIGINT;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * LEAST(p_page_size, 50);

  SELECT COUNT(*) INTO v_total FROM leads l
  WHERE l.stage NOT IN ('booked', 'lost', 'dnc');

  RETURN QUERY
  SELECT
    l.id, l.first_name, l.last_name, l.phone, l.suburb, l.stage,
    l.call_count, l.last_contact_at, l.next_callback_at,
    l.treatment_interest, l.assigned_to, l.created_at, v_total
  FROM leads l
  WHERE l.stage NOT IN ('booked', 'lost', 'dnc')
  ORDER BY
    CASE WHEN l.next_callback_at IS NOT NULL AND l.next_callback_at <= now() THEN 0 ELSE 1 END,
    l.next_callback_at NULLS LAST,
    l.created_at ASC
  LIMIT LEAST(p_page_size, 50)
  OFFSET v_offset;
END;
$$;

-- Paginated leads list RPC
CREATE OR REPLACE FUNCTION public.get_leads_list(
  p_search TEXT DEFAULT NULL,
  p_stage TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  suburb TEXT,
  stage public.lead_stage,
  source TEXT,
  assigned_to UUID,
  call_count INT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
  v_total BIGINT;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * LEAST(p_page_size, 50);

  SELECT COUNT(*) INTO v_total FROM leads l
  WHERE (p_stage IS NULL OR l.stage::TEXT = p_stage)
    AND (p_search IS NULL OR (
      l.first_name ILIKE '%' || p_search || '%'
      OR l.last_name ILIKE '%' || p_search || '%'
      OR l.phone ILIKE '%' || p_search || '%'
      OR l.suburb ILIKE '%' || p_search || '%'
    ));

  RETURN QUERY
  SELECT
    l.id, l.first_name, l.last_name, l.phone, l.email, l.suburb,
    l.stage, l.source, l.assigned_to, l.call_count, l.created_at, v_total
  FROM leads l
  WHERE (p_stage IS NULL OR l.stage::TEXT = p_stage)
    AND (p_search IS NULL OR (
      l.first_name ILIKE '%' || p_search || '%'
      OR l.last_name ILIKE '%' || p_search || '%'
      OR l.phone ILIKE '%' || p_search || '%'
      OR l.suburb ILIKE '%' || p_search || '%'
    ))
  ORDER BY l.created_at DESC
  LIMIT LEAST(p_page_size, 50)
  OFFSET v_offset;
END;
$$;

-- Lead timeline (communications + activities merged)
CREATE OR REPLACE FUNCTION public.get_lead_timeline(
  p_lead_id UUID,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  item_type TEXT,
  channel TEXT,
  direction TEXT,
  body TEXT,
  transcript_summary TEXT,
  actor_name TEXT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
  v_total BIGINT;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * LEAST(p_page_size, 50);

  SELECT COUNT(*) INTO v_total FROM (
    SELECT c.id FROM communications c WHERE c.lead_id = p_lead_id
    UNION ALL
    SELECT a.id FROM activities a WHERE a.entity_type = 'lead' AND a.entity_id = p_lead_id
  ) t;

  RETURN QUERY
  SELECT * FROM (
    SELECT
      c.id,
      'communication'::TEXT,
      c.channel::TEXT,
      c.direction::TEXT,
      COALESCE(c.body, c.transcript_summary),
      c.transcript_summary,
      sp.full_name,
      c.created_at,
      v_total
    FROM communications c
    LEFT JOIN staff_profiles sp ON sp.id = c.staff_id
    WHERE c.lead_id = p_lead_id
    UNION ALL
    SELECT
      a.id,
      'activity'::TEXT,
      a.event_type,
      NULL,
      a.payload->>'description',
      NULL,
      sp.full_name,
      a.created_at,
      v_total
    FROM activities a
    LEFT JOIN staff_profiles sp ON sp.id = a.actor_id
    WHERE a.entity_type = 'lead' AND a.entity_id = p_lead_id
  ) combined
  ORDER BY created_at DESC
  LIMIT LEAST(p_page_size, 50)
  OFFSET v_offset;
END;
$$;

-- Suggested clinics for lead (routing)
CREATE OR REPLACE FUNCTION public.get_suggested_clinics(p_lead_id UUID)
RETURNS TABLE (
  clinic_id UUID,
  clinic_name TEXT,
  suburb TEXT,
  distance_km DOUBLE PRECISION,
  drive_time_min INT,
  credit_balance INT,
  has_senior BOOLEAN,
  senior_visiting BOOLEAN,
  is_recommended BOOLEAN,
  slot_count INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.suburb,
    CASE WHEN l.latitude IS NOT NULL AND c.latitude IS NOT NULL
      THEN ROUND((6371 * acos(
        LEAST(1, cos(radians(l.latitude)) * cos(radians(c.latitude))
        * cos(radians(c.longitude) - radians(l.longitude))
        + sin(radians(l.latitude)) * sin(radians(c.latitude)))
      ))::NUMERIC, 1)::DOUBLE PRECISION
      ELSE NULL END,
    CASE WHEN l.latitude IS NOT NULL AND c.latitude IS NOT NULL
      THEN (ROUND((6371 * acos(
        LEAST(1, cos(radians(l.latitude)) * cos(radians(c.latitude))
        * cos(radians(c.longitude) - radians(l.longitude))
        + sin(radians(l.latitude)) * sin(radians(c.latitude)))
      )) / 40 * 60)::INT)
      ELSE NULL END,
    c.credit_balance,
    EXISTS(SELECT 1 FROM practitioners p WHERE p.clinic_id = c.id AND p.is_senior AND p.is_active),
    false,
    c.credit_balance > 0,
    (SELECT COUNT(*)::INT FROM get_available_slots(c.id, CURRENT_DATE + 1))
  FROM clinics c
  CROSS JOIN leads l
  WHERE l.id = p_lead_id
    AND c.is_active
    AND c.stage IN ('active', 'onboarding')
    AND c.credit_balance > 0
  ORDER BY distance_km NULLS LAST, c.name;
END;
$$;

-- Create booking RPC
CREATE OR REPLACE FUNCTION public.create_booking(
  p_lead_id UUID,
  p_clinic_id UUID,
  p_practitioner_id UUID,
  p_scheduled_start TIMESTAMPTZ,
  p_scheduled_end TIMESTAMPTZ,
  p_rep_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_lead RECORD;
BEGIN
  IF NOT public.has_permission('bookings.create') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;

  INSERT INTO bookings (
    lead_id, clinic_id, practitioner_id, assigned_rep_id,
    patient_first_name, patient_last_name, patient_phone, patient_email, patient_suburb,
    scheduled_start, scheduled_end, rep_notes, status
  ) VALUES (
    p_lead_id, p_clinic_id, p_practitioner_id, public.current_staff_profile_id(),
    v_lead.first_name, v_lead.last_name, v_lead.phone, v_lead.email, v_lead.suburb,
    p_scheduled_start, p_scheduled_end, p_rep_notes, 'scheduled'
  ) RETURNING id INTO v_booking_id;

  UPDATE leads SET stage = 'booked', updated_at = now() WHERE id = p_lead_id;

  PERFORM public.log_activity('booking.created', 'booking', v_booking_id,
    jsonb_build_object('lead_id', p_lead_id, 'clinic_id', p_clinic_id));

  RETURN v_booking_id;
END;
$$;

-- RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.callbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_zone_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_queue_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_flow_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_select ON public.leads FOR SELECT TO authenticated
  USING (public.has_permission('leads.view'));
CREATE POLICY leads_manage ON public.leads FOR ALL TO authenticated
  USING (public.has_permission('leads.manage'))
  WITH CHECK (public.has_permission('leads.manage'));

CREATE POLICY comms_select ON public.communications FOR SELECT TO authenticated
  USING (public.has_permission('leads.view') OR public.has_permission('clinics.view')
    OR clinic_id = ANY(public.get_my_clinic_ids()));
CREATE POLICY comms_insert ON public.communications FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('calls.make') OR public.has_permission('leads.manage'));

CREATE POLICY bookings_select ON public.bookings FOR SELECT TO authenticated
  USING (public.has_permission('bookings.view') OR clinic_id = ANY(public.get_my_clinic_ids()));
CREATE POLICY bookings_manage ON public.bookings FOR ALL TO authenticated
  USING (public.has_permission('bookings.create') OR public.has_permission('clinics.view'))
  WITH CHECK (public.has_permission('bookings.create'));

CREATE POLICY callbacks_select ON public.callbacks FOR SELECT TO authenticated
  USING (assigned_to = public.current_staff_profile_id() OR public.has_permission('team.manage'));
CREATE POLICY callbacks_manage ON public.callbacks FOR ALL TO authenticated
  USING (public.has_permission('leads.manage'))
  WITH CHECK (public.has_permission('leads.manage'));

CREATE POLICY call_flow_select ON public.call_flow_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY call_queue_tabs_select ON public.call_queue_tabs FOR SELECT TO authenticated USING (true);

GRANT EXECUTE ON FUNCTION public.get_call_queue TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leads_list TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_timeline TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_suggested_clinics TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking TO authenticated;

-- Seed call flow stages (from mockup)
INSERT INTO public.call_flow_stages (name, time_range, script_content, sort_order) VALUES
  ('Open', '0–2 min', 'Hi {{first_name}}, this is {{rep_name}} from Mast Dental Group. You recently enquired about dental implants — is now a good time to chat?', 1),
  ('Discover', '2–10 min', 'Tell me a bit about what''s been going on with your teeth and what you''re hoping to achieve.', 2),
  ('Map the mouth', 'Live throughout', 'Note missing teeth, current dentures/partials, bone loss concerns, and pain levels.', 3),
  ('Educate', '10–18 min', 'Explain the consult process: 3D scan, OPG, smile design, colour match, and on-screen preview.', 4),
  ('Match clinic', '18–24 min', 'Based on your location and needs, I''d recommend {{clinic_name}} — they have a senior implant dentist on site.', 5),
  ('Close, take deposit & book', '24–30 min', 'STACK THE VALUE OF THE CONSULT: At the consult we do a cone-beam 3D scan, an OPG, a smile design and colour-match — and we show you a preview of your new smile on screen. That''s normally $395.', 6)
ON CONFLICT DO NOTHING;

-- Seed demo data
INSERT INTO public.clinics (id, name, suburb, state, stage, country, timezone, credit_balance, latitude, longitude, is_active) VALUES
  ('a0000001-0000-4000-8000-000000000001', 'Mast Dental Moorooka', 'Moorooka', 'QLD', 'active', 'AU', 'Australia/Brisbane', 45, -27.5275, 153.0175, true),
  ('a0000001-0000-4000-8000-000000000002', 'Mast Dental Chermside', 'Chermside', 'QLD', 'active', 'AU', 'Australia/Brisbane', 12, -27.3856, 153.0317, true),
  ('a0000001-0000-4000-8000-000000000003', 'Mast Dental North Lakes', 'North Lakes', 'QLD', 'active', 'AU', 'Australia/Brisbane', 8, -27.2267, 153.0200, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.practitioners (id, clinic_id, full_name, is_senior, meeting_duration_minutes, buffer_minutes) VALUES
  ('b0000001-0000-4000-8000-000000000001', 'a0000001-0000-4000-8000-000000000001', 'Dr Evelyn Chin', true, 60, 15),
  ('b0000001-0000-4000-8000-000000000002', 'a0000001-0000-4000-8000-000000000002', 'Dr James Park', false, 60, 15),
  ('b0000001-0000-4000-8000-000000000003', 'a0000001-0000-4000-8000-000000000003', 'Dr Sarah Lee', false, 60, 15)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.staff_weekly_schedules (practitioner_id, clinic_id, weekday, start_time, end_time) VALUES
  ('b0000001-0000-4000-8000-000000000001', 'a0000001-0000-4000-8000-000000000001', 1, '09:00', '17:00'),
  ('b0000001-0000-4000-8000-000000000001', 'a0000001-0000-4000-8000-000000000001', 2, '09:00', '17:00'),
  ('b0000001-0000-4000-8000-000000000001', 'a0000001-0000-4000-8000-000000000001', 3, '09:00', '17:00'),
  ('b0000001-0000-4000-8000-000000000001', 'a0000001-0000-4000-8000-000000000001', 4, '09:00', '17:00'),
  ('b0000001-0000-4000-8000-000000000001', 'a0000001-0000-4000-8000-000000000001', 5, '09:00', '17:00'),
  ('b0000001-0000-4000-8000-000000000002', 'a0000001-0000-4000-8000-000000000002', 1, '09:00', '17:00'),
  ('b0000001-0000-4000-8000-000000000002', 'a0000001-0000-4000-8000-000000000002', 2, '09:00', '17:00'),
  ('b0000001-0000-4000-8000-000000000003', 'a0000001-0000-4000-8000-000000000003', 1, '09:00', '17:00')
ON CONFLICT DO NOTHING;

INSERT INTO public.leads (id, first_name, last_name, phone, email, suburb, state, source, stage, treatment_interest, funding_type, decision_maker, call_count) VALUES
  ('c0000001-0000-4000-8000-000000000001', 'Raewyn', 'Mitchell', '0412660412', 'raewyn@example.com', 'Caboolture South', 'QLD', 'facebook', 'contacted', 'Upper & Lower Set', 'Superannuation', 'David (husband)', 2),
  ('c0000001-0000-4000-8000-000000000002', 'John', 'Smith', '0400111222', 'john@example.com', 'Brisbane', 'QLD', 'facebook', 'new', 'Single implant', NULL, NULL, 0),
  ('c0000001-0000-4000-8000-000000000003', 'Maria', 'Garcia', '0400333444', 'maria@example.com', 'Redcliffe', 'QLD', 'make.com', 'callback', 'All-on-4', 'Payment plan', 'Self', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.communications (lead_id, channel, direction, body, transcript_summary, staff_id, created_at) VALUES
  ('c0000001-0000-4000-8000-000000000001', 'phone', 'outbound', NULL, 'Missing upper and lower molars. Currently wears partial plate. Husband David is decision-maker. Has $50k quote from competitor.', NULL, now() - interval '1 minute'),
  ('c0000001-0000-4000-8000-000000000001', 'internal_note', 'internal', 'David confirmed on call — superannuation funding likely.', NULL, NULL, now() - interval '2 minutes')
ON CONFLICT DO NOTHING;

INSERT INTO public.call_queue_tabs (name, filter_rules, sort_order) VALUES
  ('All leads', '{}', 1),
  ('Callbacks due', '{"has_callback": true}', 2),
  ('New today', '{"stage": "new"}', 3)
ON CONFLICT DO NOTHING;
