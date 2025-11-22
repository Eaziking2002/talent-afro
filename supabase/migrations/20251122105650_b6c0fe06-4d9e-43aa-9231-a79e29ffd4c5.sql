-- Create job alerts table for email notifications
CREATE TABLE IF NOT EXISTS job_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skills JSONB DEFAULT '[]'::jsonb,
  locations JSONB DEFAULT '[]'::jsonb,
  min_budget INTEGER DEFAULT 0,
  remote_only BOOLEAN DEFAULT false,
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('instant', 'daily', 'weekly')),
  active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE job_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_alerts
CREATE POLICY "Users can view their own job alerts"
ON job_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own job alerts"
ON job_alerts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job alerts"
ON job_alerts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job alerts"
ON job_alerts FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_job_alerts_updated_at
BEFORE UPDATE ON job_alerts
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Add email to profiles table if it doesn't exist (for job alerts)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email') THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;
END $$;