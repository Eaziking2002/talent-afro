-- Drop the constraint that requires employer_id for manual jobs
-- External API jobs should be allowed without an employer_id
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS employer_required_for_manual_jobs;