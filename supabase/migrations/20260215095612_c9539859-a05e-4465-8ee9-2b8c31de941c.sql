-- Add missing job status values
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'filled';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'closed';