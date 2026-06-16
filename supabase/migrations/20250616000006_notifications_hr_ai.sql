-- Notifications engine: emit + deliver
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_profile_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  digest_only BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (staff_profile_id, event_type)
);

CREATE OR REPLACE FUNCTION public.emit_notification(
  p_event_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_target_roles TEXT[] DEFAULT NULL
)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_route RECORD; v_recipient RECORD; v_count INT := 0;
BEGIN
  SELECT * INTO v_route FROM notification_routes WHERE event_type = p_event_type;
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR v_recipient IN
    SELECT sp.id FROM staff_profiles sp
    WHERE sp.is_active AND (
      p_target_roles IS NOT NULL AND sp.role::TEXT = ANY(p_target_roles)
      OR p_target_roles IS NULL AND sp.role::TEXT = ANY(v_route.roles)
    )
  LOOP
    INSERT INTO notifications (recipient_id, event_type, title, body, entity_type, entity_id)
    VALUES (v_recipient.id, p_event_type, p_title, p_body, p_entity_type, p_entity_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

-- Leave requests
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id),
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  approved_by UUID REFERENCES public.staff_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payroll
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL UNIQUE REFERENCES public.staff_profiles(id),
  base_rate_cents INT NOT NULL DEFAULT 0,
  commission_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  xero_employee_id TEXT
);

CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_cents INT NOT NULL DEFAULT 0,
  pushed_to_xero_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id),
  booking_id UUID REFERENCES public.bookings(id),
  amount_cents INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Community feed
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.staff_profiles(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.staff_profiles(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Call dispositions (configurable)
CREATE TABLE IF NOT EXISTS public.call_dispositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stage TEXT,
  sms_template TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Copilot cue cards
CREATE TABLE IF NOT EXISTS public.copilot_cue_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_keywords TEXT[] NOT NULL DEFAULT '{}',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Grading scorecards
CREATE TABLE IF NOT EXISTS public.grading_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  pass_threshold INT NOT NULL DEFAULT 70,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.call_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id UUID NOT NULL REFERENCES public.communications(id),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id),
  scorecard_id UUID REFERENCES public.grading_scorecards(id),
  score INT,
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'auto',
  disputed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id),
  summary TEXT NOT NULL,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  memory JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin performance dashboards
CREATE OR REPLACE VIEW public.rep_performance_view AS
SELECT sp.id AS staff_id, sp.full_name,
  COUNT(DISTINCT b.id) FILTER (WHERE b.created_at >= date_trunc('month', now())) AS bookings_month,
  COUNT(DISTINCT b.id) FILTER (WHERE b.outcome = 'showed' AND b.scheduled_start >= date_trunc('month', now())) AS shows_month,
  AVG(cg.score) FILTER (WHERE cg.created_at >= date_trunc('month', now())) AS avg_grade
FROM staff_profiles sp
LEFT JOIN bookings b ON b.assigned_rep_id = sp.id
LEFT JOIN communications c ON c.staff_id = sp.id AND c.channel = 'phone'
LEFT JOIN call_grades cg ON cg.communication_id = c.id
WHERE sp.role = 'sales_rep'
GROUP BY sp.id, sp.full_name;

CREATE OR REPLACE VIEW public.clinic_health_view AS
SELECT c.id, c.name, c.stage, c.credit_balance,
  COUNT(b.id) FILTER (WHERE b.scheduled_start >= date_trunc('month', now())) AS bookings_month,
  COUNT(b.id) FILTER (WHERE b.outcome = 'showed' AND b.scheduled_start >= date_trunc('month', now())) AS shows_month
FROM clinics c
LEFT JOIN bookings b ON b.clinic_id = c.id
GROUP BY c.id, c.name, c.stage, c.credit_balance;

GRANT SELECT ON public.rep_performance_view TO authenticated;
GRANT SELECT ON public.clinic_health_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.emit_notification TO authenticated, service_role;

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_select ON public.leave_requests FOR SELECT TO authenticated
  USING (staff_id = current_staff_profile_id() OR has_permission('team.manage'));
CREATE POLICY payroll_select ON public.payroll_settings FOR SELECT TO authenticated
  USING (has_permission('payroll.view'));
CREATE POLICY community_select ON public.community_posts FOR SELECT TO authenticated
  USING (has_permission('team.view'));

INSERT INTO public.call_dispositions (name, stage, sort_order) VALUES
  ('No answer', 'contacted', 1), ('Callback scheduled', 'callback', 2),
  ('Not interested', 'lost', 3), ('Booked', 'booked', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.grading_scorecards (name, criteria, pass_threshold) VALUES
  ('Standard sales call', '[{"key":"discovery","label":"Discovery depth","weight":25},{"key":"empathy","label":"Empathy","weight":25},{"key":"close","label":"Close attempt","weight":25},{"key":"compliance","label":"Compliance","weight":25}]', 70)
ON CONFLICT DO NOTHING;
