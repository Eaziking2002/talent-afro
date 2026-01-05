-- Fix Warning 1: Move extensions from public to extensions schema
-- First, create the extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move uuid-ossp extension to extensions schema (without IF EXISTS)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp' AND extnamespace = 'public'::regnamespace) THEN
    ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if it fails
END $$;

-- Move pgcrypto extension to extensions schema  
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto' AND extnamespace = 'public'::regnamespace) THEN
    ALTER EXTENSION "pgcrypto" SET SCHEMA extensions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Fix Critical Issue: Tighten profiles RLS to only allow access after ACCEPTED application or active contract
DROP POLICY IF EXISTS "Users can view profiles with business relationship" ON public.profiles;

CREATE POLICY "Users can view profiles with accepted business relationship" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.status IN ('active', 'completed')
    AND ((c.employer_id = auth.uid() AND c.talent_id = profiles.user_id)
      OR (c.talent_id = auth.uid() AND c.employer_id = profiles.user_id))
  )
  OR EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN employers e ON j.employer_id = e.id
    WHERE a.status = 'accepted'
    AND ((a.applicant_id = profiles.id AND e.user_id = auth.uid())
      OR (e.user_id = profiles.user_id AND a.applicant_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())))
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix Critical Issue: Tighten employers RLS
DROP POLICY IF EXISTS "Users can view employers with business relationship" ON public.employers;

CREATE POLICY "Users can view employers with accepted business relationship" 
ON public.employers 
FOR SELECT 
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.status IN ('active', 'completed')
    AND (c.employer_id = auth.uid() OR c.talent_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN profiles p ON a.applicant_id = p.id
    WHERE j.employer_id = employers.id 
    AND p.user_id = auth.uid()
    AND a.status = 'accepted'
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix: Add admin policy for transactions
CREATE POLICY "Admins can view all transactions" 
ON public.transactions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix: Restrict job_matches
DROP POLICY IF EXISTS "Talents can view their job matches" ON public.job_matches;
DROP POLICY IF EXISTS "Employers can view matches for their jobs" ON public.job_matches;

CREATE POLICY "Talents can view their own job matches" 
ON public.job_matches 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = job_matches.talent_id AND user_id = auth.uid())
);

CREATE POLICY "Employers can view matches for their own jobs" 
ON public.job_matches 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM jobs j 
    JOIN employers e ON j.employer_id = e.id 
    WHERE j.id = job_matches.job_id AND e.user_id = auth.uid()
  )
);

-- Fix: Restrict service_listings to authenticated users only
DROP POLICY IF EXISTS "Anyone can view active service listings" ON public.service_listings;

CREATE POLICY "Authenticated users can view active service listings" 
ON public.service_listings 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND active = true);

-- Fix: Rate limit referrals
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;

CREATE POLICY "Users can create limited referrals" 
ON public.referrals 
FOR INSERT 
WITH CHECK (
  auth.uid() = referrer_id
  AND (
    SELECT COUNT(*) FROM referrals 
    WHERE referrer_id = auth.uid() AND status = 'pending'
  ) < 10
);

-- Fix: Restrict portfolio_items
DROP POLICY IF EXISTS "Authenticated users can view portfolio items" ON public.portfolio_items;

CREATE POLICY "Users can view portfolio items with business context" 
ON public.portfolio_items 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM contracts c
    JOIN profiles p ON (c.talent_id = p.user_id OR c.employer_id = p.user_id)
    WHERE p.id = portfolio_items.profile_id
    AND (c.employer_id = auth.uid() OR c.talent_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM applications a
    WHERE a.applicant_id = portfolio_items.profile_id
    AND EXISTS (
      SELECT 1 FROM jobs j
      JOIN employers e ON j.employer_id = e.id
      WHERE j.id = a.job_id AND e.user_id = auth.uid()
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix: Restrict reviews
DROP POLICY IF EXISTS "Authenticated users can view reviews" ON public.reviews;

CREATE POLICY "Users can view relevant reviews" 
ON public.reviews 
FOR SELECT 
USING (
  reviewer_id = auth.uid() OR reviewee_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.status IN ('active', 'completed')
    AND ((c.employer_id = auth.uid() AND (c.talent_id = reviews.reviewee_id OR c.talent_id = reviews.reviewer_id))
      OR (c.talent_id = auth.uid() AND (c.employer_id = reviews.reviewee_id OR c.employer_id = reviews.reviewer_id)))
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix: Restrict certifications
DROP POLICY IF EXISTS "Authenticated users can view certifications" ON public.certifications;

CREATE POLICY "Users can view certifications with business context" 
ON public.certifications 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = certifications.talent_id AND user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN employers e ON j.employer_id = e.id
    WHERE a.applicant_id = certifications.talent_id AND e.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM contracts c
    JOIN profiles p ON c.talent_id = p.user_id
    WHERE p.id = certifications.talent_id
    AND (c.employer_id = auth.uid() OR c.talent_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix: Restrict verification_badges
DROP POLICY IF EXISTS "Authenticated users can view verification badges" ON public.verification_badges;

CREATE POLICY "Users can view verification badges with context" 
ON public.verification_badges 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = verification_badges.talent_id AND user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN employers e ON j.employer_id = e.id
    WHERE a.applicant_id = verification_badges.talent_id AND e.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM contracts c
    JOIN profiles p ON c.talent_id = p.user_id
    WHERE p.id = verification_badges.talent_id AND c.employer_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);