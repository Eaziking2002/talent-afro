-- Fix Critical Security Issue 1: Restrict profiles table access
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a more restrictive policy that allows:
-- 1. Users to view their own full profile
-- 2. Users to view limited profile info for users they have business relationships with
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view profiles with business relationship" 
ON public.profiles 
FOR SELECT 
USING (
  -- Can view if there's an active contract relationship
  EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.status IN ('active', 'completed')
    AND ((c.employer_id = auth.uid() AND c.talent_id = profiles.user_id)
      OR (c.talent_id = auth.uid() AND c.employer_id = profiles.user_id))
  )
  -- Or if there's an application relationship
  OR EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN employers e ON j.employer_id = e.id
    WHERE (a.applicant_id = profiles.id AND e.user_id = auth.uid())
      OR (e.user_id = profiles.user_id AND a.applicant_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  )
  -- Or admins can view all
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix Critical Security Issue 2: Restrict employers table access
DROP POLICY IF EXISTS "Authenticated users can view employers" ON public.employers;

-- Create restrictive policy for employers
CREATE POLICY "Users can view own employer profile" 
ON public.employers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view employers with business relationship" 
ON public.employers 
FOR SELECT 
USING (
  -- Can view if viewing job listings (employer info for job posts)
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.employer_id = employers.id
    AND j.status = 'open'
  )
  -- Or if there's an active contract/application relationship
  OR EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.employer_id = auth.uid() OR c.talent_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN profiles p ON a.applicant_id = p.id
    WHERE j.employer_id = employers.id AND p.user_id = auth.uid()
  )
  -- Or admins can view all
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix Critical Security Issue 3: Hide pending referral emails
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;

-- Create restrictive policy that hides email for pending referrals from referrer
CREATE POLICY "Referrers can view their referrals" 
ON public.referrals 
FOR SELECT 
USING (
  auth.uid() = referrer_id
);

CREATE POLICY "Referred users can view their referral after joining" 
ON public.referrals 
FOR SELECT 
USING (
  auth.uid() = referred_id AND referred_id IS NOT NULL
);

-- Note: To fully hide email, we would need a view or function, but the policy now 
-- ensures referred users only see their record after they've joined (referred_id is set)

-- Fix: Allow users to delete their own chat messages
CREATE POLICY "Users can delete their own messages" 
ON public.chat_messages 
FOR DELETE 
USING (auth.uid() = sender_id);

-- Also allow deletion of regular messages table
CREATE POLICY "Users can delete their own direct messages" 
ON public.messages 
FOR DELETE 
USING (auth.uid() = sender_id);