-- Fix Security Vulnerabilities: Restrict public access to sensitive data

-- 1. PROFILES: Require authentication to view profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2. EMPLOYERS: Require authentication to view employers
DROP POLICY IF EXISTS "Employers are viewable by everyone" ON public.employers;

CREATE POLICY "Authenticated users can view employers"
ON public.employers
FOR SELECT
TO authenticated
USING (true);

-- 3. REVIEWS: Require authentication to view reviews
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;

CREATE POLICY "Authenticated users can view reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (true);

-- 4. PORTFOLIO_ITEMS: Require authentication to view portfolios
DROP POLICY IF EXISTS "Users can view all portfolio items" ON public.portfolio_items;

CREATE POLICY "Authenticated users can view portfolio items"
ON public.portfolio_items
FOR SELECT
TO authenticated
USING (true);

-- 5. SKILL_ASSESSMENTS: Only talent owner, assessor, and admins can view
DROP POLICY IF EXISTS "Everyone can view assessments" ON public.skill_assessments;
DROP POLICY IF EXISTS "Talents can view their assessments" ON public.skill_assessments;

CREATE POLICY "Users can view relevant assessments"
ON public.skill_assessments
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = skill_assessments.talent_id AND profiles.user_id = auth.uid())
  OR auth.uid() = assessed_by
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 6. CERTIFICATIONS: Require authentication to view
DROP POLICY IF EXISTS "Everyone can view certifications" ON public.certifications;

CREATE POLICY "Authenticated users can view certifications"
ON public.certifications
FOR SELECT
TO authenticated
USING (true);

-- 7. VERIFICATION_BADGES: Require authentication (keep basic visibility for trust signals)
DROP POLICY IF EXISTS "Everyone can view verification badges" ON public.verification_badges;

CREATE POLICY "Authenticated users can view verification badges"
ON public.verification_badges
FOR SELECT
TO authenticated
USING (true);