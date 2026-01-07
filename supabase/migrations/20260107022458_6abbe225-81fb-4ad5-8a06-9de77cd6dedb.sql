-- Drop the existing function first to allow changing return type
DROP FUNCTION IF EXISTS public.get_profile_safe(UUID);

-- Recreate with stricter contact info visibility
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
  phone_number TEXT,
  can_view_contact BOOLEAN
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
  
  -- STRICT contact info visibility:
  -- Only own profile, ACTIVE contracts (not completed), or admin
  v_can_see_contact := (
    -- Own profile
    auth.uid() = v_profile_user_id
    OR
    -- Active contract relationship ONLY (status must be 'active', not 'completed')
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.status = 'active'
      AND (
        (c.employer_id = auth.uid() AND c.talent_id = v_profile_user_id)
        OR 
        (c.talent_id = auth.uid() AND c.employer_id = v_profile_user_id)
      )
    )
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
    CASE WHEN v_can_see_contact THEN p.phone_number ELSE NULL END,
    v_can_see_contact
  FROM profiles p
  WHERE p.id = p_profile_id;
END;
$$;

-- Update has_active_contract_with to be stricter (only 'active' status)
CREATE OR REPLACE FUNCTION public.has_active_contract_with(_profile_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.status = 'active'  -- ONLY active, not completed
    AND (
      (c.employer_id = auth.uid() AND c.talent_id = _profile_user_id)
      OR 
      (c.talent_id = auth.uid() AND c.employer_id = _profile_user_id)
    )
  )
$$;