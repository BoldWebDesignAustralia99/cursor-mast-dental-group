-- Phase 6 CRM: clinic contacts, custom fields, proposals, onboarding
CREATE TABLE IF NOT EXISTS public.clinic_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (entity_type, field_key)
);

CREATE TABLE IF NOT EXISTS public.proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  pricing_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.proposal_templates(id),
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_cents INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AUD',
  status TEXT NOT NULL DEFAULT 'draft',
  public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  signed_at TIMESTAMPTZ,
  signed_by TEXT,
  signature_url TEXT,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.staff_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.onboarding_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  label TEXT NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.staff_profiles(id),
  UNIQUE (clinic_id, item_key)
);

CREATE TABLE IF NOT EXISTS public.clinic_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  package_id UUID NOT NULL REFERENCES public.credit_packages(id),
  target_bookings INT NOT NULL,
  consumed_bookings INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Credit ledger trigger on billable booking
CREATE OR REPLACE FUNCTION public.consume_credit_on_booking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_billable BOOLEAN; v_balance INT;
BEGIN
  SELECT COALESCE((s.value->>(bc.classification))::boolean, false) INTO v_billable
  FROM booking_classifications bc
  JOIN app_settings s ON s.key = 'classification.billable_mapping'
  WHERE bc.booking_id = NEW.id ORDER BY bc.created_at DESC LIMIT 1;

  IF v_billable IS NOT TRUE THEN RETURN NEW; END IF;

  SELECT credit_balance INTO v_balance FROM clinics WHERE id = NEW.clinic_id FOR UPDATE;
  IF v_balance <= 0 THEN RAISE EXCEPTION 'Clinic has zero credits'; END IF;

  UPDATE clinics SET credit_balance = credit_balance - 1 WHERE id = NEW.clinic_id;
  INSERT INTO credit_ledger (clinic_id, amount, balance_after, reason, booking_id)
  VALUES (NEW.clinic_id, -1, v_balance - 1, 'booking_consumed', NEW.id);

  PERFORM log_activity('credit.consumed', 'booking', NEW.id, jsonb_build_object('clinic_id', NEW.clinic_id));
  RETURN NEW;
END; $$;

-- Classification review queue
CREATE TABLE IF NOT EXISTS public.classification_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  requested_by UUID REFERENCES public.staff_profiles(id),
  proposed_classification TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.staff_profiles(id),
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead stages (admin-definable) stored as settings; lead ingestion dedupe function
CREATE OR REPLACE FUNCTION public.ingest_lead(
  p_first_name TEXT, p_last_name TEXT, p_phone TEXT,
  p_email TEXT DEFAULT NULL, p_suburb TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'webhook', p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM leads WHERE phone = p_phone OR (p_email IS NOT NULL AND email = p_email) LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO leads (first_name, last_name, phone, email, suburb, source, custom_fields)
  VALUES (p_first_name, p_last_name, p_phone, p_email, p_suburb, p_source, p_metadata)
  RETURNING id INTO v_id;

  PERFORM log_activity('lead.created', 'lead', v_id, p_metadata);
  RETURN v_id;
END; $$;

-- Clinic timeline merged RPC
CREATE OR REPLACE FUNCTION public.get_clinic_timeline(p_clinic_id UUID, p_page INT DEFAULT 1, p_page_size INT DEFAULT 50)
RETURNS TABLE (id UUID, item_type TEXT, summary TEXT, created_at TIMESTAMPTZ, total_count BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_offset INT; v_total BIGINT;
BEGIN
  v_offset := (GREATEST(p_page,1)-1)*LEAST(p_page_size,50);
  SELECT COUNT(*) INTO v_total FROM (
    SELECT c.id FROM communications c WHERE c.clinic_id = p_clinic_id
    UNION ALL SELECT a.id FROM activities a WHERE a.entity_type='clinic' AND a.entity_id=p_clinic_id
  ) t;
  RETURN QUERY SELECT * FROM (
    SELECT c.id, 'communication'::TEXT, COALESCE(c.body,c.transcript_summary,''), c.created_at, v_total
    FROM communications c WHERE c.clinic_id = p_clinic_id
    UNION ALL
    SELECT a.id, 'activity'::TEXT, a.event_type, a.created_at, v_total
    FROM activities a WHERE a.entity_type='clinic' AND a.entity_id=p_clinic_id
  ) x ORDER BY created_at DESC LIMIT LEAST(p_page_size,50) OFFSET v_offset;
END; $$;

-- Routing matrix view
CREATE OR REPLACE VIEW public.routing_matrix_view AS
SELECT z.id AS zone_id, z.name AS zone_name, c.id AS clinic_id, c.name AS clinic_name,
  rzc.weight, rzc.cap_per_period, rzc.period_count, c.credit_balance
FROM routing_zones z
JOIN routing_zone_clinics rzc ON rzc.zone_id = z.id
JOIN clinics c ON c.id = rzc.clinic_id
WHERE z.is_active AND c.is_active;

GRANT EXECUTE ON FUNCTION public.ingest_lead TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_clinic_timeline TO authenticated;
GRANT SELECT ON public.routing_matrix_view TO authenticated;

ALTER TABLE public.clinic_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY clinic_contacts_select ON public.clinic_contacts FOR SELECT TO authenticated
  USING (public.has_permission('clinics.view') OR clinic_id = ANY(get_my_clinic_ids()));
CREATE POLICY proposals_select ON public.proposals FOR SELECT TO authenticated
  USING (public.has_permission('clinics.view'));
CREATE POLICY classification_reviews_select ON public.classification_reviews FOR SELECT TO authenticated
  USING (public.has_permission('bookings.view') OR public.has_permission('team.manage'));

INSERT INTO public.onboarding_checklist_items (clinic_id, item_key, label)
SELECT c.id, item.key, item.label FROM clinics c
CROSS JOIN (VALUES
  ('portal_accounts','Portal accounts created'),
  ('staff_added','Clinic staff added'),
  ('calendars','Calendars configured'),
  ('prices','Treatment prices set'),
  ('gocardless','GoCardless mandate completed'),
  ('first_booking','First booking delivered')
) AS item(key, label)
ON CONFLICT DO NOTHING;
