
-- All-in-one fix for profiles RLS infinite recursion
-- Step 1: Clean up any remaining policies
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Active contract parties can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Employers can view active applicant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Step 2: Create SECURITY DEFINER function (bypasses RLS, prevents recursion)
CREATE OR REPLACE FUNCTION public.can_view_profile(_profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    auth.uid() = _profile_user_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.status IN ('active', 'completed')
      AND (
        (c.employer_id = auth.uid() AND c.talent_id = _profile_user_id)
        OR (c.talent_id = auth.uid() AND c.employer_id = _profile_user_id)
      )
    )
    OR EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN employers e ON j.employer_id = e.id
      WHERE a.applicant_id IN (SELECT p.id FROM profiles p WHERE p.user_id = _profile_user_id)
      AND e.user_id = auth.uid()
      AND a.status IN ('pending'::application_status, 'accepted'::application_status)
    )
$$;

-- Step 3: Create clean policies
CREATE POLICY "Users can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.can_view_profile(user_id));

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
