-- Add unique constraint to prevent duplicate applications
ALTER TABLE applications 
ADD CONSTRAINT applications_applicant_job_unique 
UNIQUE (applicant_id, job_id);