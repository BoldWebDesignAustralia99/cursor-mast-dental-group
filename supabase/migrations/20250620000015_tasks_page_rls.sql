-- Task create/update policies for the tasks page
CREATE POLICY tasks_insert ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission('team.view')
    AND assigned_by = public.current_staff_profile_id()
    AND (
      assigned_to = public.current_staff_profile_id()
      OR assigned_to IS NULL
      OR public.has_permission('team.manage')
    )
  );

CREATE POLICY tasks_update ON public.tasks FOR UPDATE TO authenticated
  USING (
    assigned_to = public.current_staff_profile_id()
    OR public.has_permission('team.manage')
  );

-- Seed starter tasks for active staff (skip if tasks already exist)
INSERT INTO public.tasks (title, description, assigned_to, assigned_by, due_at, status)
SELECT
  v.title,
  v.description,
  sp.id,
  sp.id,
  v.due_at,
  'open'
FROM public.staff_profiles sp
CROSS JOIN (
  VALUES
    ('Review callback queue', 'Check overdue callbacks and assign follow-ups', now() + interval '1 day'),
    ('Update clinic routing matrix', 'Verify zone weights and credit caps are current', now() + interval '3 days'),
    ('Complete training module', 'Finish the latest sales script certification', now() + interval '7 days')
) AS v(title, description, due_at)
WHERE sp.is_active = true
  AND sp.role IN ('super_admin', 'admin', 'manager', 'sales_rep')
  AND NOT EXISTS (SELECT 1 FROM public.tasks LIMIT 1);
