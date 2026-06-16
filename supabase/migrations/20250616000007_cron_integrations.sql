-- Cron jobs (pg_cron) — defined in migrations per spec
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Reminder job placeholder: calls edge function via pg_net if available
-- Stale callback cleanup
CREATE OR REPLACE FUNCTION public.cleanup_stale_callbacks()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  UPDATE callbacks SET completed_at = now()
  WHERE completed_at IS NULL AND due_at < now() - interval '7 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

-- Capacity cache refresh
CREATE TABLE IF NOT EXISTS public.clinic_capacity_cache (
  clinic_id UUID PRIMARY KEY REFERENCES public.clinics(id),
  slot_count_7d INT NOT NULL DEFAULT 0,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.refresh_capacity_cache()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_clinic RECORD; v_count INT; v_total INT := 0; d DATE;
BEGIN
  FOR v_clinic IN SELECT id FROM clinics WHERE is_active LOOP
    v_count := 0;
    FOR d IN SELECT generate_series(CURRENT_DATE, CURRENT_DATE + 6, '1 day')::DATE LOOP
      v_count := v_count + (SELECT COUNT(*)::INT FROM get_available_slots(v_clinic.id, d));
    END LOOP;
    INSERT INTO clinic_capacity_cache (clinic_id, slot_count_7d, refreshed_at)
    VALUES (v_clinic.id, v_count, now())
    ON CONFLICT (clinic_id) DO UPDATE SET slot_count_7d = EXCLUDED.slot_count_7d, refreshed_at = now();
    v_total := v_total + 1;
  END LOOP;
  RETURN v_total;
END; $$;

-- Reassign leads from paused clinics
CREATE OR REPLACE FUNCTION public.reassign_leads_from_paused_clinics()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  UPDATE leads SET assigned_clinic_id = NULL, updated_at = now()
  WHERE assigned_clinic_id IN (SELECT id FROM clinics WHERE credit_balance <= 0 OR stage = 'paused');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

-- Schedule cron jobs (ignore if pg_cron unavailable)
DO $$ BEGIN
  PERFORM cron.schedule('cleanup-stale-callbacks', '0 3 * * *', 'SELECT public.cleanup_stale_callbacks()');
  PERFORM cron.schedule('refresh-capacity-cache', '0 */6 * * *', 'SELECT public.refresh_capacity_cache()');
  PERFORM cron.schedule('reassign-paused-clinics', '0 4 * * *', 'SELECT public.reassign_leads_from_paused_clinics()');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Integration credentials (super_admin only — values in vault/env, keys referenced here)
CREATE TABLE IF NOT EXISTS public.integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES public.staff_profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.integration_configs (integration_key, label) VALUES
  ('twilio_au', 'Twilio Australia'),
  ('twilio_us', 'Twilio USA'),
  ('stripe', 'Stripe'),
  ('gocardless', 'GoCardless'),
  ('resend', 'Resend'),
  ('anthropic', 'Anthropic'),
  ('openai', 'OpenAI'),
  ('deepgram', 'Deepgram'),
  ('elevenlabs', 'ElevenLabs'),
  ('mapbox', 'Mapbox'),
  ('xero', 'Xero'),
  ('praktika', 'Praktika PMS')
ON CONFLICT (integration_key) DO NOTHING;

ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY integrations_select ON public.integration_configs FOR SELECT TO authenticated
  USING (has_permission('integrations.manage'));
CREATE POLICY integrations_manage ON public.integration_configs FOR ALL TO authenticated
  USING (has_permission('integrations.manage')) WITH CHECK (has_permission('integrations.manage'));

-- PMS sync log
CREATE TABLE IF NOT EXISTS public.pms_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  direction TEXT NOT NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT EXECUTE ON FUNCTION public.cleanup_stale_callbacks TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_capacity_cache TO service_role;
GRANT EXECUTE ON FUNCTION public.reassign_leads_from_paused_clinics TO service_role;
