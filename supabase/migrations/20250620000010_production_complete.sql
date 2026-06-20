-- Phase 10: Production completion — telephony, online booking, clinic calling, automation execution, pod RLS

-- Brands (tenancy)
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id);

-- Call logs (telephony — private IP, clinics never see recordings)
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id),
  booking_id UUID REFERENCES public.bookings(id),
  clinic_id UUID REFERENCES public.clinics(id),
  staff_profile_id UUID REFERENCES public.staff_profiles(id),
  twilio_call_sid TEXT UNIQUE,
  direction TEXT NOT NULL DEFAULT 'outbound',
  from_number TEXT,
  to_number TEXT,
  status TEXT NOT NULL DEFAULT 'initiated',
  duration_seconds INT,
  recording_url TEXT,
  recording_duration INT,
  transcript TEXT,
  ai_summary TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.live_transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID NOT NULL REFERENCES public.call_logs(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id),
  speaker TEXT NOT NULL DEFAULT 'unknown',
  text TEXT NOT NULL,
  is_final BOOLEAN NOT NULL DEFAULT false,
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transcript_call ON public.live_transcript_segments(call_log_id, created_at);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON public.call_logs(lead_id, started_at DESC);

-- Clinic calling numbers (clinic portal outbound)
CREATE TABLE IF NOT EXISTS public.clinic_calling_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  twilio_sid TEXT,
  region TEXT NOT NULL DEFAULT 'US',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, phone_number)
);

-- Online booking funnel
CREATE TABLE IF NOT EXISTS public.online_booking_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deposit_cents INT NOT NULL DEFAULT 7500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.online_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.online_booking_pages(id),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Twilio phone numbers pool
CREATE TABLE IF NOT EXISTS public.twilio_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL DEFAULT 'US',
  state TEXT,
  twilio_sid TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Execute automation for domain event
CREATE OR REPLACE FUNCTION public.run_automations_for_event(
  p_event_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_auto RECORD; v_run_id UUID; v_count INT := 0;
BEGIN
  FOR v_auto IN
    SELECT * FROM marketing_automations
    WHERE status = 'active' AND trigger_type::TEXT = p_event_type
  LOOP
    INSERT INTO automation_runs (automation_id, entity_type, entity_id, status, idempotency_key)
    VALUES (v_auto.id, p_entity_type, p_entity_id, 'running', p_event_type || ':' || p_entity_id::TEXT || ':' || v_auto.id::TEXT)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_run_id;

    IF v_run_id IS NOT NULL THEN
      PERFORM enqueue_job('execute_automation', jsonb_build_object(
        'run_id', v_run_id, 'automation_id', v_auto.id, 'payload', p_payload
      ), 'automation:' || v_run_id::TEXT);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Trigger automations on booking create
CREATE OR REPLACE FUNCTION public.on_booking_created_automation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM run_automations_for_event('booking_created', 'booking', NEW.id,
    jsonb_build_object('clinic_id', NEW.clinic_id, 'lead_id', NEW.lead_id));
  PERFORM emit_domain_event('booking_created', 'booking', NEW.id,
    jsonb_build_object('clinic_id', NEW.clinic_id), 'booking_created:' || NEW.id::TEXT);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_created_automation ON public.bookings;
CREATE TRIGGER booking_created_automation
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.on_booking_created_automation();

-- Public online booking page RPC
CREATE OR REPLACE FUNCTION public.get_online_booking_page(p_slug TEXT)
RETURNS TABLE (
  page_id UUID, title TEXT, description TEXT, clinic_id UUID, clinic_name TEXT,
  suburb TEXT, deposit_cents INT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.title, p.description, p.clinic_id, c.name, c.suburb, p.deposit_cents
  FROM online_booking_pages p
  JOIN clinics c ON c.id = p.clinic_id
  WHERE p.slug = p_slug AND p.is_active AND c.is_active;
$$;

CREATE OR REPLACE FUNCTION public.create_online_booking(
  p_slug TEXT, p_first_name TEXT, p_last_name TEXT, p_phone TEXT,
  p_email TEXT, p_scheduled_start TIMESTAMPTZ, p_scheduled_end TIMESTAMPTZ
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_page RECORD; v_id UUID;
BEGIN
  SELECT p.*, c.id AS cid INTO v_page
  FROM online_booking_pages p JOIN clinics c ON c.id = p.clinic_id
  WHERE p.slug = p_slug AND p.is_active LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking page not found'; END IF;

  INSERT INTO online_bookings (page_id, clinic_id, first_name, last_name, phone, email, scheduled_start, scheduled_end, status)
  VALUES (v_page.id, v_page.clinic_id, p_first_name, p_last_name, p_phone, p_email, p_scheduled_start, p_scheduled_end, 'confirmed')
  RETURNING id INTO v_id;

  PERFORM run_automations_for_event('booking_created', 'online_booking', v_id, jsonb_build_object('clinic_id', v_page.clinic_id));
  RETURN v_id;
END;
$$;

-- Start outbound call log
CREATE OR REPLACE FUNCTION public.start_call_log(
  p_lead_id UUID, p_to_number TEXT, p_twilio_call_sid TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO call_logs (lead_id, staff_profile_id, to_number, twilio_call_sid, direction, status)
  VALUES (p_lead_id, current_staff_profile_id(), p_to_number, p_twilio_call_sid, 'outbound', 'in-progress')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.append_transcript_segment(
  p_call_log_id UUID, p_speaker TEXT, p_text TEXT, p_is_final BOOLEAN DEFAULT true
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_lead UUID;
BEGIN
  SELECT lead_id INTO v_lead FROM call_logs WHERE id = p_call_log_id;
  INSERT INTO live_transcript_segments (call_log_id, lead_id, speaker, text, is_final)
  VALUES (p_call_log_id, v_lead, p_speaker, p_text, p_is_final)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_clinic_patient_comms(p_clinic_id UUID, p_booking_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID, channel TEXT, direction TEXT, body TEXT, duration_seconds INT,
  ai_summary TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.channel::TEXT, c.direction::TEXT,
    COALESCE(c.body, c.transcript_summary, ''), c.duration_seconds,
    c.transcript_summary, c.created_at
  FROM communications c
  WHERE c.clinic_id = p_clinic_id
    AND (p_booking_id IS NULL OR c.booking_id = p_booking_id)
    AND c.recording_url IS NULL
  ORDER BY c.created_at DESC LIMIT 50;
END;
$$;

-- Pod-scoped lead access for sales reps
CREATE OR REPLACE FUNCTION public.can_access_lead(p_lead_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    has_permission('team.manage')
    OR has_permission('leads.manage')
    OR EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = p_lead_id
        AND (l.assigned_to = current_staff_profile_id() OR l.assigned_to IS NULL)
    );
$$;

-- RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_calling_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_booking_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twilio_phone_numbers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'brands_select' AND tablename = 'brands') THEN
    CREATE POLICY brands_select ON public.brands FOR SELECT TO authenticated USING (has_permission('clinics.view'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'call_logs_select' AND tablename = 'call_logs') THEN
    CREATE POLICY call_logs_select ON public.call_logs FOR SELECT TO authenticated
      USING (staff_profile_id = current_staff_profile_id() OR has_permission('team.manage'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'call_logs_insert' AND tablename = 'call_logs') THEN
    CREATE POLICY call_logs_insert ON public.call_logs FOR INSERT TO authenticated
      WITH CHECK (staff_profile_id = current_staff_profile_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'transcript_select' AND tablename = 'live_transcript_segments') THEN
    CREATE POLICY transcript_select ON public.live_transcript_segments FOR SELECT TO authenticated
      USING (has_permission('calls.make') OR has_permission('team.manage'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'clinic_calling_select' AND tablename = 'clinic_calling_numbers') THEN
    CREATE POLICY clinic_calling_select ON public.clinic_calling_numbers FOR SELECT TO authenticated
      USING (clinic_id = ANY(get_my_clinic_ids()) OR has_permission('clinics.view'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'online_pages_public' AND tablename = 'online_booking_pages') THEN
    CREATE POLICY online_pages_public ON public.online_booking_pages FOR SELECT TO anon, authenticated USING (is_active);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'online_bookings_clinic' AND tablename = 'online_bookings') THEN
    CREATE POLICY online_bookings_clinic ON public.online_bookings FOR SELECT TO authenticated
      USING (clinic_id = ANY(get_my_clinic_ids()) OR has_permission('bookings.view'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'twilio_numbers_select' AND tablename = 'twilio_phone_numbers') THEN
    CREATE POLICY twilio_numbers_select ON public.twilio_phone_numbers FOR SELECT TO authenticated
      USING (has_permission('integrations.manage') OR has_permission('calls.make'));
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.get_online_booking_page TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_online_booking TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_call_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_transcript_segment TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_clinic_patient_comms TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_automations_for_event TO service_role;

-- Seed brand + online booking page
INSERT INTO public.brands (id, name, country) VALUES
  ('b0000001-0000-4000-8000-000000000001', 'Mast Dental Group', 'AU')
ON CONFLICT (id) DO NOTHING;

UPDATE public.clinics SET brand_id = 'b0000001-0000-4000-8000-000000000001'
WHERE brand_id IS NULL;

INSERT INTO public.online_booking_pages (id, clinic_id, slug, title, description, deposit_cents) VALUES
  ('c0000001-0000-4000-8000-000000000001', 'a0000001-0000-4000-8000-000000000001',
   'moorooka-implants', 'Book Your Free Implant Consult', 'Schedule your consultation at Mast Dental Moorooka', 7500)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.clinic_calling_numbers (clinic_id, phone_number, region) VALUES
  ('a0000001-0000-4000-8000-000000000001', '+61730000001', 'AU'),
  ('a0000001-0000-4000-8000-000000000002', '+61730000002', 'AU')
ON CONFLICT (clinic_id, phone_number) DO NOTHING;
