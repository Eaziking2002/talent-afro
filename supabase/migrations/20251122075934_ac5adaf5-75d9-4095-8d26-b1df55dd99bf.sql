-- Add new columns to jobs table for AI scraping and monetization
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS ai_scraped boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS external_url text,
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS featured_until timestamp with time zone;

-- Create index for featured jobs
CREATE INDEX IF NOT EXISTS idx_jobs_featured ON public.jobs(is_featured, created_at DESC) WHERE status = 'open';

-- Create index for AI scraped jobs
CREATE INDEX IF NOT EXISTS idx_jobs_ai_scraped ON public.jobs(ai_scraped, created_at DESC);

-- Update RLS policies to allow system to create AI-scraped jobs
CREATE POLICY "System can create AI-scraped jobs"
ON public.jobs
FOR INSERT
WITH CHECK (ai_scraped = true);

-- Allow admins to update any job
CREATE POLICY "Admins can update any job"
ON public.jobs
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create a table for job scraping logs
CREATE TABLE IF NOT EXISTS public.job_scraping_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  jobs_found integer DEFAULT 0,
  jobs_created integer DEFAULT 0,
  jobs_rejected integer DEFAULT 0,
  error_message text,
  execution_time_ms integer,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed'))
);

-- Enable RLS on job_scraping_logs
ALTER TABLE public.job_scraping_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view scraping logs
CREATE POLICY "Admins can view scraping logs"
ON public.job_scraping_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

COMMENT ON COLUMN public.jobs.is_featured IS 'Featured jobs appear at the top of listings';
COMMENT ON COLUMN public.jobs.source IS 'Source of the job posting: manual, ai_scraped, api';
COMMENT ON COLUMN public.jobs.ai_scraped IS 'Whether this job was collected by AI scraper';
COMMENT ON COLUMN public.jobs.external_url IS 'Original job posting URL if scraped';
COMMENT ON COLUMN public.jobs.company_name IS 'Company name for AI-scraped jobs without employer account';
COMMENT ON COLUMN public.jobs.verification_status IS 'Admin verification status for scraped jobs';