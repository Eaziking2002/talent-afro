
-- ============ APPLICATIONS: new columns ============
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS cv_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_letter TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_links JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS github_url TEXT,
  ADD COLUMN IF NOT EXISTS salary_expectation_minor_units BIGINT,
  ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS availability TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS years_experience INTEGER,
  ADD COLUMN IF NOT EXISTS remote_preference TEXT,
  ADD COLUMN IF NOT EXISTS tracking_status TEXT NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT now();

-- Validate tracking_status values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_tracking_status_check') THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_tracking_status_check
      CHECK (tracking_status IN ('submitted','viewed','shortlisted','interview','rejected','hired','withdrawn'));
  END IF;
END $$;

-- Validate availability + remote_preference
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_availability_check') THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_availability_check
      CHECK (availability IS NULL OR availability IN ('immediate','2_weeks','1_month','negotiable'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_remote_pref_check') THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_remote_pref_check
      CHECK (remote_preference IS NULL OR remote_preference IN ('remote','hybrid','onsite','any'));
  END IF;
END $$;

-- Prevent duplicate applications
CREATE UNIQUE INDEX IF NOT EXISTS applications_job_applicant_unique
  ON public.applications(job_id, applicant_id);

CREATE INDEX IF NOT EXISTS applications_tracking_status_idx
  ON public.applications(tracking_status);

-- ============ JOBS: new columns ============
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS visa_sponsorship BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS experience_level TEXT,
  ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_experience_level_check') THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_experience_level_check
      CHECK (experience_level IS NULL OR experience_level IN ('entry','mid','senior','lead','executive'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS jobs_visa_idx ON public.jobs(visa_sponsorship) WHERE visa_sponsorship = true;
CREATE INDEX IF NOT EXISTS jobs_experience_level_idx ON public.jobs(experience_level);

-- ============ saved_applications (drafts) ============
CREATE TABLE IF NOT EXISTS public.saved_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_id UUID NOT NULL,
  draft_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

ALTER TABLE public.saved_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own drafts" ON public.saved_applications;
CREATE POLICY "Users manage own drafts" ON public.saved_applications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER saved_applications_updated_at
  BEFORE UPDATE ON public.saved_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============ application_status_history ============
CREATE TABLE IF NOT EXISTS public.application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties can view application history" ON public.application_status_history;
CREATE POLICY "Parties can view application history" ON public.application_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON j.id = a.job_id
      JOIN employers e ON e.id = j.employer_id
      LEFT JOIN profiles p ON p.id = a.applicant_id
      WHERE a.id = application_status_history.application_id
        AND (e.user_id = auth.uid() OR p.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

DROP POLICY IF EXISTS "System inserts history" ON public.application_status_history;
CREATE POLICY "System inserts history" ON public.application_status_history
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS application_status_history_app_idx
  ON public.application_status_history(application_id, created_at DESC);

-- ============ Trigger: log status changes + notify talent ============
CREATE OR REPLACE FUNCTION public.handle_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_talent_user_id UUID;
  v_job_title TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.tracking_status IS DISTINCT FROM OLD.tracking_status THEN
    NEW.status_updated_at := now();

    INSERT INTO application_status_history(application_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.tracking_status, NEW.tracking_status, auth.uid());

    SELECT p.user_id, j.title INTO v_talent_user_id, v_job_title
    FROM profiles p, jobs j
    WHERE p.id = NEW.applicant_id AND j.id = NEW.job_id;

    IF v_talent_user_id IS NOT NULL THEN
      INSERT INTO notifications(user_id, type, title, description, related_id, related_type, metadata)
      VALUES (
        v_talent_user_id,
        'application_status',
        'Application update: ' || NEW.tracking_status,
        'Your application for "' || COALESCE(v_job_title,'a job') || '" was moved to ' || NEW.tracking_status,
        NEW.id,
        'application',
        jsonb_build_object('from', OLD.tracking_status, 'to', NEW.tracking_status)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS application_status_change_trigger ON public.applications;
CREATE TRIGGER application_status_change_trigger
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_application_status_change();

-- ============ Trigger: notify employer on new application ============
CREATE OR REPLACE FUNCTION public.handle_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employer_user_id UUID;
  v_job_title TEXT;
BEGIN
  SELECT e.user_id, j.title INTO v_employer_user_id, v_job_title
  FROM jobs j JOIN employers e ON e.id = j.employer_id
  WHERE j.id = NEW.job_id;

  IF v_employer_user_id IS NOT NULL THEN
    INSERT INTO notifications(user_id, type, title, description, related_id, related_type)
    VALUES (
      v_employer_user_id,
      'new_application',
      'New application received',
      'Someone applied to your job "' || COALESCE(v_job_title,'') || '"',
      NEW.id,
      'application'
    );
  END IF;

  INSERT INTO application_status_history(application_id, from_status, to_status, changed_by)
  VALUES (NEW.id, NULL, NEW.tracking_status, auth.uid());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS new_application_trigger ON public.applications;
CREATE TRIGGER new_application_trigger
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_application();

-- ============ Storage bucket for CVs ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-cvs', 'application-cvs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Talents upload own CVs" ON storage.objects;
CREATE POLICY "Talents upload own CVs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'application-cvs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Owners read own CVs" ON storage.objects;
CREATE POLICY "Owners read own CVs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'application-cvs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Employers read CVs of applicants" ON storage.objects;
CREATE POLICY "Employers read CVs of applicants" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'application-cvs'
    AND EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON j.id = a.job_id
      JOIN employers e ON e.id = j.employer_id
      WHERE e.user_id = auth.uid()
        AND a.cv_url LIKE '%' || name
    )
  );

DROP POLICY IF EXISTS "Owners delete own CVs" ON storage.objects;
CREATE POLICY "Owners delete own CVs" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'application-cvs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Backfill existing applications: set tracking_status from legacy status
UPDATE public.applications
SET tracking_status = CASE
  WHEN status::text = 'pending'  THEN 'submitted'
  WHEN status::text = 'accepted' THEN 'shortlisted'
  WHEN status::text = 'rejected' THEN 'rejected'
  ELSE 'submitted'
END
WHERE tracking_status = 'submitted';
