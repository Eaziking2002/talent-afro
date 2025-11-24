-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('message', 'contract_update', 'payment', 'milestone', 'dispute', 'application', 'negotiation')),
  title TEXT NOT NULL,
  description TEXT,
  related_id UUID,
  related_type TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add milestone dependencies column
ALTER TABLE public.milestones
ADD COLUMN depends_on UUID REFERENCES public.milestones(id) ON DELETE SET NULL;

-- Create job matches table for AI recommendations
CREATE TABLE public.job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  talent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_score NUMERIC NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(job_id, talent_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their notifications as read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- RLS Policies for job_matches
CREATE POLICY "Employers can view matches for their jobs"
  ON public.job_matches FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.jobs
    JOIN public.employers ON jobs.employer_id = employers.id
    WHERE jobs.id = job_matches.job_id
    AND employers.user_id = auth.uid()
  ));

CREATE POLICY "Talents can view their matches"
  ON public.job_matches FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = job_matches.talent_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "System can create matches"
  ON public.job_matches FOR INSERT
  WITH CHECK (true);

-- Add indexes
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX idx_milestones_depends ON public.milestones(depends_on);
CREATE INDEX idx_job_matches_job ON public.job_matches(job_id);
CREATE INDEX idx_job_matches_talent ON public.job_matches(talent_id);
CREATE INDEX idx_job_matches_score ON public.job_matches(match_score DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to check if milestone dependencies are completed
CREATE OR REPLACE FUNCTION public.check_milestone_dependencies(milestone_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dependency_id UUID;
  dependency_status TEXT;
BEGIN
  SELECT depends_on INTO dependency_id
  FROM milestones
  WHERE id = milestone_id;
  
  IF dependency_id IS NULL THEN
    RETURN true;
  END IF;
  
  SELECT status INTO dependency_status
  FROM milestones
  WHERE id = dependency_id;
  
  RETURN dependency_status = 'approved' OR dependency_status = 'completed';
END;
$$;