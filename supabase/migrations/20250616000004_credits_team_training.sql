-- Phase 5-8: Credits, notifications, training, team
-- Mast Dental Group

DO $$ BEGIN
  CREATE TYPE public.notification_channel AS ENUM ('in_app', 'email', 'sms');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Credit packages and ledger
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credit_count INT NOT NULL,
  price_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AUD',
  country TEXT NOT NULL DEFAULT 'AU',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  reason TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  package_id UUID REFERENCES public.credit_packages(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  invoice_number TEXT NOT NULL UNIQUE,
  amount_cents INT NOT NULL,
  tax_cents INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AUD',
  status TEXT NOT NULL DEFAULT 'pending',
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.staff_profiles(id),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  channel_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read, created_at DESC);

-- Notification routing (admin-editable)
CREATE TABLE IF NOT EXISTS public.notification_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL UNIQUE,
  roles TEXT[] NOT NULL DEFAULT '{}',
  channels public.notification_channel[] NOT NULL DEFAULT '{in_app}',
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Training journeys
CREATE TABLE IF NOT EXISTS public.training_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.training_journeys(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stage_type TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  pass_threshold INT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id),
  stage_id UUID NOT NULL REFERENCES public.training_stages(id),
  status TEXT NOT NULL DEFAULT 'not_started',
  score INT,
  attempts INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_id, stage_id)
);

-- Timesheets
CREATE TABLE IF NOT EXISTS public.timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id),
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES public.staff_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.staff_profiles(id),
  assigned_by UUID REFERENCES public.staff_profiles(id),
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open',
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Internal messages
CREATE TABLE IF NOT EXISTS public.internal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.staff_profiles(id),
  channel_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  is_group BOOLEAN NOT NULL DEFAULT false,
  member_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dashboard stats view
CREATE OR REPLACE VIEW public.dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM leads WHERE stage NOT IN ('booked', 'lost', 'dnc')) AS open_leads,
  (SELECT COUNT(*) FROM bookings WHERE scheduled_start::DATE = CURRENT_DATE AND status NOT IN ('cancelled')) AS bookings_today,
  (SELECT COUNT(*) FROM bookings WHERE outcome = 'showed' AND scheduled_start >= date_trunc('week', CURRENT_DATE)) AS shows_this_week,
  (SELECT COUNT(*) FROM callbacks WHERE completed_at IS NULL AND due_at <= now()) AS callbacks_due,
  (SELECT COUNT(*) FROM tasks WHERE status = 'open') AS open_tasks;

-- Paginated notifications RPC
CREATE OR REPLACE FUNCTION public.get_my_notifications(
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 50
)
RETURNS TABLE (
  id UUID, event_type TEXT, title TEXT, body TEXT,
  entity_type TEXT, entity_id UUID, is_read BOOLEAN, created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_offset INT; v_total BIGINT;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * LEAST(p_page_size, 50);
  SELECT COUNT(*) INTO v_total FROM notifications WHERE recipient_id = current_staff_profile_id();
  RETURN QUERY
  SELECT n.id, n.event_type, n.title, n.body, n.entity_type, n.entity_id, n.is_read, n.created_at, v_total
  FROM notifications n WHERE n.recipient_id = current_staff_profile_id()
  ORDER BY n.created_at DESC LIMIT LEAST(p_page_size, 50) OFFSET v_offset;
END;
$$;

-- Paginated bookings list RPC
CREATE OR REPLACE FUNCTION public.get_bookings_list(
  p_search TEXT DEFAULT NULL, p_page INT DEFAULT 1, p_page_size INT DEFAULT 50
)
RETURNS TABLE (
  id UUID, patient_first_name TEXT, patient_last_name TEXT, patient_phone TEXT,
  clinic_name TEXT, scheduled_start TIMESTAMPTZ, status public.booking_status,
  outcome public.booking_outcome, deposit_status public.deposit_status,
  total_count BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_offset INT; v_total BIGINT;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * LEAST(p_page_size, 50);
  SELECT COUNT(*) INTO v_total FROM bookings b
  WHERE p_search IS NULL OR b.patient_first_name ILIKE '%'||p_search||'%' OR b.patient_last_name ILIKE '%'||p_search||'%';
  RETURN QUERY
  SELECT b.id, b.patient_first_name, b.patient_last_name, b.patient_phone,
    c.name, b.scheduled_start, b.status, b.outcome, b.deposit_status, v_total
  FROM bookings b JOIN clinics c ON c.id = b.clinic_id
  WHERE p_search IS NULL OR b.patient_first_name ILIKE '%'||p_search||'%' OR b.patient_last_name ILIKE '%'||p_search||'%'
  ORDER BY b.scheduled_start DESC LIMIT LEAST(p_page_size, 50) OFFSET v_offset;
END;
$$;

-- Paginated clinics list RPC
CREATE OR REPLACE FUNCTION public.get_clinics_list(
  p_stage TEXT DEFAULT NULL, p_page INT DEFAULT 1, p_page_size INT DEFAULT 50
)
RETURNS TABLE (
  id UUID, name TEXT, suburb TEXT, stage TEXT, credit_balance INT,
  country TEXT, is_active BOOLEAN, total_count BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_offset INT; v_total BIGINT;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * LEAST(p_page_size, 50);
  SELECT COUNT(*) INTO v_total FROM clinics c WHERE p_stage IS NULL OR c.stage = p_stage;
  RETURN QUERY
  SELECT c.id, c.name, c.suburb, c.stage, c.credit_balance, c.country, c.is_active, v_total
  FROM clinics c WHERE p_stage IS NULL OR c.stage = p_stage
  ORDER BY c.name LIMIT LEAST(p_page_size, 50) OFFSET v_offset;
END;
$$;

-- RLS
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = current_staff_profile_id());
CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = current_staff_profile_id());

CREATE POLICY credit_ledger_select ON public.credit_ledger FOR SELECT TO authenticated
  USING (public.has_permission('clinics.billing.manage') OR clinic_id = ANY(get_my_clinic_ids()));

CREATE POLICY credit_packages_select ON public.credit_packages FOR SELECT TO authenticated USING (true);

CREATE POLICY training_select ON public.training_journeys FOR SELECT TO authenticated
  USING (public.has_permission('training.view'));
CREATE POLICY timesheets_select ON public.timesheets FOR SELECT TO authenticated
  USING (staff_id = current_staff_profile_id() OR public.has_permission('team.manage'));
CREATE POLICY tasks_select ON public.tasks FOR SELECT TO authenticated
  USING (assigned_to = current_staff_profile_id() OR public.has_permission('team.view'));

GRANT SELECT ON public.dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bookings_list TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clinics_list TO authenticated;

-- Seed credit packages
INSERT INTO public.credit_packages (name, credit_count, price_cents, currency, country) VALUES
  ('Starter — 10 credits', 10, 450000, 'AUD', 'AU'),
  ('Growth — 25 credits', 25, 1000000, 'AUD', 'AU'),
  ('Enterprise — 50 credits', 50, 1800000, 'AUD', 'AU')
ON CONFLICT DO NOTHING;

INSERT INTO public.notification_routes (event_type, roles, channels, is_urgent) VALUES
  ('lead.assigned', ARRAY['sales_rep'], ARRAY['in_app']::public.notification_channel[], false),
  ('callback.due', ARRAY['sales_rep'], ARRAY['in_app', 'sms']::public.notification_channel[], true),
  ('booking.created', ARRAY['clinic_admin', 'clinic_staff'], ARRAY['in_app', 'email']::public.notification_channel[], false),
  ('credit.low', ARRAY['clinic_admin', 'admin'], ARRAY['in_app', 'email']::public.notification_channel[], false),
  ('payment.failed', ARRAY['admin', 'super_admin'], ARRAY['in_app', 'email']::public.notification_channel[], true)
ON CONFLICT (event_type) DO NOTHING;

INSERT INTO public.training_journeys (name, description) VALUES
  ('Sales onboarding', 'Complete onboarding for new sales reps')
ON CONFLICT DO NOTHING;
