-- Phase 13: Scheduled maintenance jobs

DO $$ BEGIN
  PERFORM cron.schedule('expire-lead-locks', '* * * * *', 'SELECT public.expire_stale_lead_locks()');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Edge function workers (process-jobs, send-reminders, process-coaching) should be
-- scheduled via Supabase Dashboard → Edge Functions → Cron or an external scheduler
-- hitting /functions/v1/process-jobs?batch=10 with the service role key.
