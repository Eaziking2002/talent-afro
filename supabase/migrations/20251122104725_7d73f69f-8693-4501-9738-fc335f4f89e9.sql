-- Make employer_id nullable for AI-scraped jobs
ALTER TABLE jobs ALTER COLUMN employer_id DROP NOT NULL;

-- Add a check constraint to ensure employer_id is provided for non-AI jobs
ALTER TABLE jobs ADD CONSTRAINT employer_required_for_manual_jobs 
  CHECK (ai_scraped = true OR employer_id IS NOT NULL);

-- Update the RLS policy for creating AI-scraped jobs
DROP POLICY IF EXISTS "System can create AI-scraped jobs" ON jobs;

CREATE POLICY "System can create AI-scraped jobs" 
ON jobs 
FOR INSERT 
WITH CHECK (ai_scraped = true AND employer_id IS NULL);