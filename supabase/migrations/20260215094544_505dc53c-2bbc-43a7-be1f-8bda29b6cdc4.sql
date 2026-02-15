
-- Add job_type and expires_at to jobs table
ALTER TABLE public.jobs 
  ADD COLUMN IF NOT EXISTS job_type text DEFAULT 'full-time',
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_posted timestamp with time zone DEFAULT now();

-- Create function to auto-expire jobs
CREATE OR REPLACE FUNCTION public.auto_expire_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE jobs
  SET status = 'expired'
  WHERE status = 'open'
    AND expires_at IS NOT NULL
    AND expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Create function to mark job as filled and archive
CREATE OR REPLACE FUNCTION public.mark_job_filled(p_job_id uuid, p_employer_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE jobs
  SET status = 'filled'
  WHERE id = p_job_id
    AND employer_id IN (SELECT id FROM employers WHERE user_id = p_employer_user_id);
  RETURN FOUND;
END;
$$;
