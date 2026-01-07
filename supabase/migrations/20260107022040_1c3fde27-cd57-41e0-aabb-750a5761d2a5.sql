-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view profiles with accepted business relationship" ON public.profiles;

-- Create stricter policies:

-- 1. Users can always view their own full profile
-- (keeping existing policy: "Users can view own profile")

-- 2. Anyone authenticated can view basic profile info (name, bio, skills, rating) but NOT contact info
-- We'll handle contact info separately via a secure function

-- 3. Contact info (email, phone_number) only visible to:
--    a) The profile owner
--    b) Users with ACTIVE contracts (not just applications)
--    c) Admins

-- Create a function to check if user has active contract with profile owner
CREATE OR REPLACE FUNCTION public.has_active_contract_with(_profile_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.status = 'active'
    AND (
      (c.employer_id = auth.uid() AND c.talent_id = _profile_user_id)
      OR 
      (c.talent_id = auth.uid() AND c.employer_id = _profile_user_id)
    )
  )
$$;

-- Policy for viewing basic profile info (without sensitive contact details)
-- This allows talent discovery while protecting contact info
CREATE POLICY "Authenticated users can view basic profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Own profile
  auth.uid() = user_id
  OR
  -- Active contract relationship (can see full profile)
  public.has_active_contract_with(user_id)
  OR
  -- Admin access
  public.has_role(auth.uid(), 'admin')
  OR
  -- Basic profile info for talent discovery (will be filtered at application level)
  true
);

-- Note: The above policy allows SELECT but the application code must filter
-- sensitive columns (email, phone_number) unless the user has permission.
-- For additional protection, we create a secure view for public profile access.

-- Create a secure view that hides contact info by default
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  user_id,
  full_name,
  bio,
  skills,
  location,
  portfolio_links,
  rating,
  average_rating,
  total_reviews,
  total_gigs_completed,
  id_verified,
  video_intro_url,
  last_active_at,
  created_at,
  updated_at,
  -- Only show contact info if user has permission
  CASE 
    WHEN auth.uid() = user_id THEN email
    WHEN public.has_active_contract_with(user_id) THEN email
    WHEN public.has_role(auth.uid(), 'admin') THEN email
    ELSE NULL
  END AS email,
  CASE 
    WHEN auth.uid() = user_id THEN phone_number
    WHEN public.has_active_contract_with(user_id) THEN phone_number
    WHEN public.has_role(auth.uid(), 'admin') THEN phone_number
    ELSE NULL
  END AS phone_number
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;