-- Add location column to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS location text;