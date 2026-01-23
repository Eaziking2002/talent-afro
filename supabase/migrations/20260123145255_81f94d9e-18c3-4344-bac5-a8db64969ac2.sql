-- Create feedback table for tester submissions
CREATE TABLE public.tester_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('bug', 'suggestion', 'question', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  page_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tester_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can submit feedback (even anonymous users)
CREATE POLICY "Anyone can submit feedback" 
ON public.tester_feedback 
FOR INSERT 
WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback" 
ON public.tester_feedback 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback" 
ON public.tester_feedback 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can update feedback status
CREATE POLICY "Admins can update feedback" 
ON public.tester_feedback 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);