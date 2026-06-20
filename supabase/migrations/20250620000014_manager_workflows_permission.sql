-- Grant workflow builder access to managers
INSERT INTO public.role_permissions (role, permission_key, allowed)
SELECT 'manager'::public.user_role, key, true FROM public.permission_keys
WHERE key IN ('workflows.view', 'workflows.build')
ON CONFLICT (role, permission_key) DO UPDATE SET allowed = EXCLUDED.allowed;
