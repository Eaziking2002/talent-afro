-- Drop the security definer view (flagged by linter)
DROP VIEW IF EXISTS public.profiles_public;

-- Drop the overly permissive policy we created
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;

-- Create a more secure approach: restrict profile access to specific scenarios
-- but allow basic info viewing for talent discovery

-- Policy 1: Users can view their own full profile (existing)
-- Policy 2: Active contract parties can view full profile
-- Policy 3: Employers can view basic profile info for applicants to their jobs (for talent discovery)
-- Policy 4: Admins can view all

CREATE POLICY "Users with active contracts can view full profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_active_contract_with(user_id)
);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- For talent discovery, employers can view profiles of applicants to their jobs
-- This is more restrictive than before - only after someone applies
CREATE POLICY "Employers can view applicant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN employers e ON j.employer_id = e.id
    WHERE a.applicant_id = profiles.id
    AND e.user_id = auth.uid()
  )
);

-- Create a secure function to get profile with contact info filtered
-- This returns NULL for email/phone unless user has permission
CREATE OR REPLACE FUNCTION public.get_profile_safe(p_profile_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  bio TEXT,
  skills JSONB,
  location TEXT,
  portfolio_links JSONB,
  rating NUMERIC,
  average_rating NUMERIC,
  total_reviews INTEGER,
  total_gigs_completed INTEGER,
  id_verified BOOLEAN,
  video_intro_url TEXT,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  email TEXT,
  phone_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_user_id UUID;
  v_can_see_contact BOOLEAN := false;
BEGIN
  -- Get the user_id for this profile
  SELECT p.user_id INTO v_profile_user_id
  FROM profiles p
  WHERE p.id = p_profile_id;
  
  IF v_profile_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if current user can see contact info
  v_can_see_contact := (
    -- Own profile
    auth.uid() = v_profile_user_id
    OR
    -- Active contract relationship
    public.has_active_contract_with(v_profile_user_id)
    OR
    -- Admin
    public.has_role(auth.uid(), 'admin')
  );
  
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.bio,
    p.skills,
    p.location,
    p.portfolio_links,
    p.rating,
    p.average_rating,
    p.total_reviews,
    p.total_gigs_completed,
    p.id_verified,
    p.video_intro_url,
    p.last_active_at,
    p.created_at,
    p.updated_at,
    CASE WHEN v_can_see_contact THEN p.email ELSE NULL END,
    CASE WHEN v_can_see_contact THEN p.phone_number ELSE NULL END
  FROM profiles p
  WHERE p.id = p_profile_id;
END;
$$;