-- Phase 2: Clinics, practitioners, availability engine
-- Mast Dental Group

-- Clinic lifecycle stages
DO $$ BEGIN
  CREATE TYPE public.clinic_stage AS ENUM (
    'lead', 'in_pipeline', 'proposal_sent', 'signed',
    'onboarding', 'active', 'paused', 'churned'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS suburb TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postcode TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.staff_profiles(id),
  ADD COLUMN IF NOT EXISTS credit_balance INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pms_enabled BOOLEAN NOT NULL DEFAULT false;

-- Migrate stage column to enum if text
ALTER TABLE public.clinics
  ALTER COLUMN stage SET DEFAULT 'lead';

-- Practitioners (dentists — records, not logins)
CREATE TABLE IF NOT EXISTS public.practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  title TEXT DEFAULT 'Dr',
  is_senior BOOLEAN NOT NULL DEFAULT false,
  meeting_duration_minutes INT NOT NULL DEFAULT 60,
  buffer_minutes INT NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Weekly availability per practitioner per weekday (0=Sun, 6=Sat)
CREATE TABLE IF NOT EXISTS public.staff_weekly_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  weekday INT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (practitioner_id, clinic_id, weekday)
);

-- Date-specific overrides
CREATE TABLE IF NOT EXISTS public.staff_schedule_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  is_unavailable BOOLEAN NOT NULL DEFAULT false,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  UNIQUE (practitioner_id, clinic_id, override_date)
);

-- Public holidays per region
CREATE TABLE IF NOT EXISTS public.public_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  UNIQUE (region, holiday_date)
);

-- Clinic closed dates
CREATE TABLE IF NOT EXISTS public.clinic_closed_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  closed_date DATE NOT NULL,
  reason TEXT,
  UNIQUE (clinic_id, closed_date)
);

CREATE INDEX IF NOT EXISTS idx_practitioners_clinic ON public.practitioners(clinic_id);
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_practitioner ON public.staff_weekly_schedules(practitioner_id);

-- RLS
ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedule_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_closed_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY practitioners_select ON public.practitioners FOR SELECT TO authenticated
  USING (public.has_permission('clinics.view') OR clinic_id = ANY(public.get_my_clinic_ids()));

CREATE POLICY practitioners_manage ON public.practitioners FOR ALL TO authenticated
  USING (public.has_permission('clinics.manage') OR public.has_permission('portal.calendar.manage'))
  WITH CHECK (public.has_permission('clinics.manage') OR public.has_permission('portal.calendar.manage'));

CREATE POLICY weekly_schedules_select ON public.staff_weekly_schedules FOR SELECT TO authenticated
  USING (public.has_permission('clinics.view') OR clinic_id = ANY(public.get_my_clinic_ids()));

CREATE POLICY weekly_schedules_manage ON public.staff_weekly_schedules FOR ALL TO authenticated
  USING (public.has_permission('clinics.manage') OR public.has_permission('portal.calendar.manage'))
  WITH CHECK (public.has_permission('clinics.manage') OR public.has_permission('portal.calendar.manage'));

CREATE POLICY schedule_overrides_select ON public.staff_schedule_overrides FOR SELECT TO authenticated
  USING (public.has_permission('clinics.view') OR clinic_id = ANY(public.get_my_clinic_ids()));

CREATE POLICY schedule_overrides_manage ON public.staff_schedule_overrides FOR ALL TO authenticated
  USING (public.has_permission('clinics.manage') OR public.has_permission('portal.calendar.manage'))
  WITH CHECK (public.has_permission('clinics.manage') OR public.has_permission('portal.calendar.manage'));

CREATE POLICY public_holidays_select ON public.public_holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY clinic_closed_select ON public.clinic_closed_dates FOR SELECT TO authenticated
  USING (public.has_permission('clinics.view') OR clinic_id = ANY(public.get_my_clinic_ids()));
