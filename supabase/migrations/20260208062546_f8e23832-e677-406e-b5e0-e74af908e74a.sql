
-- ============================================================
-- FIX: Isolate contact info (email, phone) from profiles table
-- into a separate profile_private table with strict RLS
-- ============================================================

-- 1. Create profile_private table for sensitive contact data
CREATE TABLE IF NOT EXISTS public.profile_private (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

-- 3. Strict RLS: owner-only + admin access
CREATE POLICY "Users can view own contact info"
ON public.profile_private FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all contact info"
ON public.profile_private FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own contact info"
ON public.profile_private FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contact info"
ON public.profile_private FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Migrate existing contact data from profiles to profile_private
INSERT INTO public.profile_private (user_id, email, phone_number)
SELECT user_id, email, phone_number FROM public.profiles
WHERE email IS NOT NULL OR phone_number IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 5. NULL out sensitive data from profiles table
UPDATE public.profiles SET email = NULL, phone_number = NULL;

-- 6. Create get_contact_info RPC for secure access to contact data
CREATE OR REPLACE FUNCTION public.get_contact_info(target_user_id UUID)
RETURNS TABLE(email TEXT, phone_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Allow: owner, admin, or active contract party
  IF auth.uid() = target_user_id
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_active_contract_with(target_user_id) THEN
    RETURN QUERY
    SELECT pp.email, pp.phone_number
    FROM profile_private pp
    WHERE pp.user_id = target_user_id;
  ELSE
    -- Return empty result for unauthorized access
    RETURN;
  END IF;
END;
$$;

-- 7. Update get_profile_safe to read contact info from profile_private
CREATE OR REPLACE FUNCTION public.get_profile_safe(p_profile_id uuid)
RETURNS TABLE(
  id uuid, user_id uuid, full_name text, bio text, skills jsonb, 
  location text, portfolio_links jsonb, rating numeric, average_rating numeric, 
  total_reviews integer, total_gigs_completed integer, id_verified boolean, 
  video_intro_url text, last_active_at timestamp with time zone, 
  created_at timestamp with time zone, updated_at timestamp with time zone, 
  email text, phone_number text, can_view_contact boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  -- Only own profile, ACTIVE contracts, or admin
  v_can_see_contact := (
    auth.uid() = v_profile_user_id
    OR
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
    CASE WHEN v_can_see_contact THEN pp.email ELSE NULL END,
    CASE WHEN v_can_see_contact THEN pp.phone_number ELSE NULL END,
    v_can_see_contact
  FROM profiles p
  LEFT JOIN profile_private pp ON pp.user_id = p.user_id
  WHERE p.id = p_profile_id;
END;
$$;

-- 8. Add updated_at trigger for profile_private
CREATE TRIGGER update_profile_private_updated_at
BEFORE UPDATE ON public.profile_private
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
