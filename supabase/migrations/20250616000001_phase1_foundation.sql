-- Phase 1: Foundation — auth, roles, permissions, settings, activities
-- Mast Dental Group platform

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'admin',
    'manager',
    'sales_rep',
    'trainer',
    'clinic_admin',
    'clinic_staff'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.theme_preference AS ENUM ('system', 'light', 'dark');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.setting_value_type AS ENUM (
    'string', 'number', 'boolean', 'json', 'string_array'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Core tables
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'sales_rep',
  phone TEXT,
  avatar_url TEXT,
  theme_preference public.theme_preference NOT NULL DEFAULT 'system',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'lead',
  country TEXT NOT NULL DEFAULT 'AU',
  timezone TEXT NOT NULL DEFAULT 'Australia/Sydney',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinic_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_profile_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  role public.user_role NOT NULL CHECK (role IN ('clinic_admin', 'clinic_staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_profile_id, clinic_id)
);

CREATE TABLE IF NOT EXISTS public.permission_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.user_role NOT NULL,
  permission_key TEXT NOT NULL REFERENCES public.permission_keys(key) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, permission_key)
);

CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_profile_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permission_keys(key) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL,
  granted_by UUID REFERENCES public.staff_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_profile_id, permission_key)
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT 'null'::jsonb,
  value_type public.setting_value_type NOT NULL DEFAULT 'string',
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_public BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES public.staff_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  actor_id UUID REFERENCES public.staff_profiles(id),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_entity ON public.activities (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_actor ON public.activities (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_user ON public.staff_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_memberships_staff ON public.clinic_memberships (staff_profile_id);
CREATE INDEX IF NOT EXISTS idx_clinic_memberships_clinic ON public.clinic_memberships (clinic_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS staff_profiles_updated_at ON public.staff_profiles;
CREATE TRIGGER staff_profiles_updated_at
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS role_permissions_updated_at ON public.role_permissions;
CREATE TRIGGER role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS app_settings_updated_at ON public.app_settings;
CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper: current staff profile id
CREATE OR REPLACE FUNCTION public.current_staff_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.staff_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Helper: clinic ids for current user
CREATE OR REPLACE FUNCTION public.get_my_clinic_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(cm.clinic_id), ARRAY[]::UUID[])
  FROM public.clinic_memberships cm
  WHERE cm.staff_profile_id = public.current_staff_profile_id();
$$;

-- Effective permissions view (role defaults + user overrides)
CREATE OR REPLACE VIEW public.user_permissions_view AS
WITH base AS (
  SELECT
    sp.id AS staff_profile_id,
    sp.user_id,
    rp.permission_key,
    rp.allowed
  FROM public.staff_profiles sp
  JOIN public.role_permissions rp ON rp.role = sp.role
),
overrides AS (
  SELECT
    upo.staff_profile_id,
    sp.user_id,
    upo.permission_key,
    upo.allowed
  FROM public.user_permission_overrides upo
  JOIN public.staff_profiles sp ON sp.id = upo.staff_profile_id
)
SELECT
  COALESCE(o.staff_profile_id, b.staff_profile_id) AS staff_profile_id,
  COALESCE(o.user_id, b.user_id) AS user_id,
  COALESCE(o.permission_key, b.permission_key) AS permission_key,
  COALESCE(o.allowed, b.allowed) AS allowed
FROM base b
FULL OUTER JOIN overrides o
  ON o.staff_profile_id = b.staff_profile_id
  AND o.permission_key = b.permission_key;

-- Permission check function
CREATE OR REPLACE FUNCTION public.has_permission(permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT allowed
      FROM public.user_permissions_view
      WHERE user_id = auth.uid()
        AND permission_key = has_permission.permission_key
      LIMIT 1
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS TABLE (permission_key TEXT, allowed BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT upv.permission_key, upv.allowed
  FROM public.user_permissions_view upv
  WHERE upv.user_id = auth.uid()
    AND upv.allowed = true;
$$;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.staff_profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.*
  FROM public.staff_profiles sp
  WHERE sp.user_id = auth.uid()
  LIMIT 1;
$$;

-- Activity logging helper
CREATE OR REPLACE FUNCTION public.log_activity(
  p_event_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.activities (event_type, entity_type, entity_id, actor_id, payload)
  VALUES (p_event_type, p_entity_type, p_entity_id, public.current_staff_profile_id(), p_payload)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Permission change audit trigger
CREATE OR REPLACE FUNCTION public.audit_role_permission_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_activity(
    'permission.role_changed',
    'role_permission',
    NEW.id,
    jsonb_build_object(
      'role', NEW.role,
      'permission_key', NEW.permission_key,
      'allowed', NEW.allowed
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_role_permission ON public.role_permissions;
CREATE TRIGGER audit_role_permission
  AFTER INSERT OR UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_role_permission_change();

-- Seed permission keys
INSERT INTO public.permission_keys (key, module, label, description, is_sensitive, sort_order) VALUES
  ('dashboard.view', 'dashboard', 'View dashboard', 'Access the main dashboard', false, 1),
  ('leads.view', 'leads', 'View leads', 'View patient lead list and records', false, 1),
  ('leads.manage', 'leads', 'Manage leads', 'Create, edit, assign leads', false, 2),
  ('bookings.view', 'bookings', 'View bookings', 'View booking list and records', false, 1),
  ('bookings.create', 'bookings', 'Create bookings', 'Book appointments for leads', false, 2),
  ('bookings.refund', 'bookings', 'Refund deposits', 'Process Stripe deposit refunds', true, 3),
  ('calls.queue.view', 'calls', 'View call queue', 'Access the call queue screen', false, 1),
  ('calls.make', 'calls', 'Make calls', 'Initiate outbound calls via Twilio', false, 2),
  ('clinics.view', 'clinics', 'View clinics', 'View clinic CRM records', false, 1),
  ('clinics.manage', 'clinics', 'Manage clinics', 'Edit clinic records and pipeline', false, 2),
  ('clinics.billing.manage', 'clinics', 'Manage clinic billing', 'Credits, invoices, GoCardless', true, 3),
  ('clinics.comms.view', 'clinics', 'View comms inbox', 'Clinic communications inbox', false, 4),
  ('training.view', 'training', 'View training', 'Access training journeys', false, 1),
  ('training.manage', 'training', 'Manage training', 'Build and review training content', false, 2),
  ('team.view', 'team', 'View team', 'Timesheets, leave, tasks, messages', false, 1),
  ('team.manage', 'team', 'Manage team', 'Approvals and staff management', false, 2),
  ('payroll.view', 'payroll', 'View payroll', 'View payroll calculations', true, 1),
  ('payroll.finalize', 'payroll', 'Finalize payroll', 'Finalize and push pay runs', true, 2),
  ('settings.view', 'settings', 'View settings', 'View platform settings', false, 1),
  ('settings.edit', 'settings', 'Edit settings', 'Modify platform settings', true, 2),
  ('permissions.manage', 'permissions', 'Manage permissions', 'Edit role and user permissions', true, 1),
  ('integrations.manage', 'integrations', 'Manage integrations', 'API credentials and webhooks', true, 1),
  ('notifications.view', 'notifications', 'View notifications', 'Access notification feed', false, 1),
  ('ai.admin_chat', 'ai', 'Admin AI chat', 'Internal AI assistant', false, 1),
  ('portal.bookings.view', 'portal', 'View portal bookings', 'Clinic bookings feed', false, 1),
  ('portal.calendar.manage', 'portal', 'Manage portal calendar', 'Edit clinic calendar availability', false, 2),
  ('portal.credits.view', 'portal', 'View credits', 'View credit balance and history', false, 3),
  ('portal.credits.purchase', 'portal', 'Purchase credits', 'Buy credit top-ups', false, 4),
  ('portal.messages.view', 'portal', 'View portal messages', 'Messages with platform team', false, 5)
ON CONFLICT (key) DO NOTHING;

-- Seed role permissions
-- super_admin: all permissions
INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT 'super_admin'::public.user_role, pk.key, true
FROM public.permission_keys pk
ON CONFLICT (role, permission_key) DO NOTHING;

-- admin: everything except permissions.manage, integrations.manage, payroll.finalize
INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT 'admin'::public.user_role, pk.key,
  pk.key NOT IN ('permissions.manage', 'integrations.manage', 'payroll.finalize')
FROM public.permission_keys pk
ON CONFLICT (role, permission_key) DO NOTHING;

-- manager
INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT 'manager'::public.user_role, pk.key,
  pk.key IN (
    'dashboard.view', 'leads.view', 'leads.manage', 'bookings.view', 'bookings.create',
    'calls.queue.view', 'calls.make', 'clinics.view', 'clinics.comms.view',
    'training.view', 'team.view', 'team.manage', 'notifications.view'
  )
FROM public.permission_keys pk
ON CONFLICT (role, permission_key) DO NOTHING;

-- sales_rep
INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT 'sales_rep'::public.user_role, pk.key,
  pk.key IN (
    'dashboard.view', 'leads.view', 'leads.manage', 'bookings.view', 'bookings.create',
    'calls.queue.view', 'calls.make', 'training.view', 'team.view', 'notifications.view'
  )
FROM public.permission_keys pk
ON CONFLICT (role, permission_key) DO NOTHING;

-- trainer
INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT 'trainer'::public.user_role, pk.key,
  pk.key IN (
    'dashboard.view', 'training.view', 'training.manage', 'team.view', 'notifications.view'
  )
FROM public.permission_keys pk
ON CONFLICT (role, permission_key) DO NOTHING;

-- clinic_admin
INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT 'clinic_admin'::public.user_role, pk.key,
  pk.key IN (
    'dashboard.view', 'portal.bookings.view', 'portal.calendar.manage',
    'portal.credits.view', 'portal.credits.purchase', 'portal.messages.view',
    'notifications.view'
  )
FROM public.permission_keys pk
ON CONFLICT (role, permission_key) DO NOTHING;

-- clinic_staff
INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT 'clinic_staff'::public.user_role, pk.key,
  pk.key IN (
    'dashboard.view', 'portal.bookings.view', 'portal.calendar.manage',
    'portal.messages.view', 'notifications.view'
  )
FROM public.permission_keys pk
ON CONFLICT (role, permission_key) DO NOTHING;

-- Seed app settings (business rules live in DB, not code)
INSERT INTO public.app_settings (key, value, value_type, label, description, category) VALUES
  ('app.name', '"Mast Dental Group"', 'string', 'Application name', 'Display name across the platform', 'general'),
  ('app.default_page_size', '50', 'number', 'Default page size', 'Rows per page for list screens', 'general'),
  ('booking.reminder_hours', '[48, 2]', 'json', 'Reminder timings (hours before)', 'SMS and email reminder schedule', 'bookings'),
  ('booking.default_duration_minutes', '60', 'number', 'Default slot duration', 'Meeting duration in minutes', 'bookings'),
  ('booking.default_buffer_minutes', '15', 'number', 'Default slot buffer', 'Buffer between slots in minutes', 'bookings'),
  ('classification.billable_mapping', '{"multi_implant": true, "all_on_x": true, "single_implant": false, "cosmetic_only": false, "unknown": false}', 'json', 'Billable classification mapping', 'Which classifications consume a credit', 'billing'),
  ('credits.low_balance_threshold', '5', 'number', 'Low balance threshold', 'Credits remaining before low-balance alerts', 'billing'),
  ('credits.zero_balance_pause', 'true', 'boolean', 'Pause at zero balance', 'Automatically pause clinic lead routing at zero credits', 'billing'),
  ('lead.welcome_sms_template', '"Hi {{first_name}}, thanks for your enquiry about dental implants. We will call you shortly."', 'string', 'Welcome SMS template', 'Sent when a new lead arrives', 'leads'),
  ('lead.excluded_locations', '[]', 'string_array', 'Excluded locations', 'Suburbs/cities excluded from routing', 'leads'),
  ('ai.primary_provider', '"anthropic"', 'string', 'Primary AI provider', 'anthropic or openai', 'ai'),
  ('ai.fallback_provider', '"openai"', 'string', 'Fallback AI provider', 'Used when primary fails', 'ai'),
  ('ai.classification_temperature', '0.2', 'number', 'Classification temperature', 'AI temperature for booking classification', 'ai'),
  ('ai.coaching_temperature', '0.7', 'number', 'Coaching temperature', 'AI temperature for coaching feedback', 'ai'),
  ('notifications.urgent_events', '["callback_overdue", "payment_failed", "zero_balance"]', 'json', 'Urgent notification events', 'Always deliver immediately regardless of digest settings', 'notifications')
ON CONFLICT (key) DO NOTHING;

-- Row Level Security
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- staff_profiles policies
CREATE POLICY staff_profiles_select ON public.staff_profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_permission('team.manage')
    OR public.has_permission('permissions.manage')
  );

CREATE POLICY staff_profiles_update_self ON public.staff_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY staff_profiles_manage ON public.staff_profiles
  FOR ALL TO authenticated
  USING (public.has_permission('team.manage'))
  WITH CHECK (public.has_permission('team.manage'));

-- clinics policies (internal staff see all; clinic users see own)
CREATE POLICY clinics_select_internal ON public.clinics
  FOR SELECT TO authenticated
  USING (
    public.has_permission('clinics.view')
    OR id = ANY(public.get_my_clinic_ids())
  );

CREATE POLICY clinics_manage ON public.clinics
  FOR ALL TO authenticated
  USING (public.has_permission('clinics.manage'))
  WITH CHECK (public.has_permission('clinics.manage'));

-- clinic_memberships
CREATE POLICY clinic_memberships_select ON public.clinic_memberships
  FOR SELECT TO authenticated
  USING (
    staff_profile_id = public.current_staff_profile_id()
    OR public.has_permission('clinics.manage')
    OR public.has_permission('team.manage')
  );

-- permission_keys: readable by all authenticated
CREATE POLICY permission_keys_select ON public.permission_keys
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY permission_keys_manage ON public.permission_keys
  FOR ALL TO authenticated
  USING (public.has_permission('permissions.manage'))
  WITH CHECK (public.has_permission('permissions.manage'));

-- role_permissions
CREATE POLICY role_permissions_select ON public.role_permissions
  FOR SELECT TO authenticated
  USING (public.has_permission('permissions.manage') OR public.has_permission('team.manage'));

CREATE POLICY role_permissions_manage ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.has_permission('permissions.manage'))
  WITH CHECK (public.has_permission('permissions.manage'));

-- user_permission_overrides
CREATE POLICY user_overrides_select ON public.user_permission_overrides
  FOR SELECT TO authenticated
  USING (public.has_permission('permissions.manage'));

CREATE POLICY user_overrides_manage ON public.user_permission_overrides
  FOR ALL TO authenticated
  USING (public.has_permission('permissions.manage'))
  WITH CHECK (public.has_permission('permissions.manage'));

-- app_settings
CREATE POLICY app_settings_select ON public.app_settings
  FOR SELECT TO authenticated
  USING (public.has_permission('settings.view') OR is_public = true);

CREATE POLICY app_settings_update ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.has_permission('settings.edit'))
  WITH CHECK (public.has_permission('settings.edit'));

-- activities
CREATE POLICY activities_select ON public.activities
  FOR SELECT TO authenticated
  USING (
    public.has_permission('team.manage')
    OR actor_id = public.current_staff_profile_id()
  );

CREATE POLICY activities_insert ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Grant view access
GRANT SELECT ON public.user_permissions_view TO authenticated;

-- Auto-create staff profile on signup (service role assigns role separately)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff_profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'sales_rep')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
