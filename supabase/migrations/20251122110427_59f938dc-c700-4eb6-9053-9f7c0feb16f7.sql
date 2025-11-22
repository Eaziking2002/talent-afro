-- Create job views tracking table
CREATE TABLE IF NOT EXISTS job_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  session_id TEXT NOT NULL,
  UNIQUE(job_id, session_id)
);

-- Create job bookmarks table
CREATE TABLE IF NOT EXISTS job_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(job_id, profile_id)
);

-- Enable RLS
ALTER TABLE job_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_views
CREATE POLICY "Anyone can insert job views"
ON job_views FOR INSERT
WITH CHECK (true);

CREATE POLICY "Employers can view their job views"
ON job_views FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN employers e ON j.employer_id = e.id
    WHERE j.id = job_views.job_id
    AND e.user_id = auth.uid()
  )
);

-- RLS policies for job_bookmarks
CREATE POLICY "Users can view their own bookmarks"
ON job_bookmarks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
ON job_bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks"
ON job_bookmarks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
ON job_bookmarks FOR DELETE
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_viewed_at ON job_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_job_bookmarks_user_id ON job_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_job_bookmarks_job_id ON job_bookmarks(job_id);