-- Add verification and trust score fields to employers table
ALTER TABLE public.employers
ADD COLUMN IF NOT EXISTS trust_score integer DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
ADD COLUMN IF NOT EXISTS verification_level text DEFAULT 'unverified' CHECK (verification_level IN ('unverified', 'basic', 'verified', 'premium')),
ADD COLUMN IF NOT EXISTS verification_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS total_jobs_posted integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS successful_hires integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS verification_notes text;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_employers_verification ON public.employers(verification_level, trust_score);

-- Create table to store admin email preferences
CREATE TABLE IF NOT EXISTS public.admin_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notify_new_jobs boolean DEFAULT true,
  notify_new_employers boolean DEFAULT true,
  notify_payment_issues boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.admin_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin notification preferences
CREATE POLICY "Admins can manage their notification preferences"
ON public.admin_notification_preferences
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to automatically calculate trust score
CREATE OR REPLACE FUNCTION public.calculate_employer_trust_score(employer_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_score integer := 0;
  jobs_count integer;
  verified_jobs integer;
  hire_rate numeric;
BEGIN
  -- Get job statistics
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE verification_status = 'verified')
  INTO jobs_count, verified_jobs
  FROM jobs
  WHERE jobs.employer_id = calculate_employer_trust_score.employer_id;

  -- Base score from verification level
  SELECT 
    CASE verification_level
      WHEN 'premium' THEN 50
      WHEN 'verified' THEN 30
      WHEN 'basic' THEN 15
      ELSE 0
    END
  INTO base_score
  FROM employers
  WHERE id = employer_id;

  -- Add points for verified jobs (up to 20 points)
  IF jobs_count > 0 THEN
    base_score := base_score + LEAST(20, (verified_jobs * 20 / GREATEST(jobs_count, 1)));
  END IF;

  -- Add points for successful hires (up to 30 points)
  SELECT successful_hires INTO hire_rate FROM employers WHERE id = employer_id;
  base_score := base_score + LEAST(30, hire_rate * 3);

  RETURN LEAST(100, base_score);
END;
$$;

-- Trigger to update trust score when employer data changes
CREATE OR REPLACE FUNCTION public.update_employer_trust_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.trust_score := calculate_employer_trust_score(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_employer_trust_score
BEFORE UPDATE ON public.employers
FOR EACH ROW
EXECUTE FUNCTION update_employer_trust_score();