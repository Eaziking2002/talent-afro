-- Restrict anonymous profile history access to profiles explicitly marked public
DROP POLICY IF EXISTS "Anon can view education" ON public.education;
CREATE POLICY "Anon can view education for public profiles"
  ON public.education
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = education.profile_id
        AND p.user_id = education.user_id
        AND p.profile_visibility = 'public'
    )
  );

DROP POLICY IF EXISTS "Users can view education via profile visibility" ON public.education;
CREATE POLICY "Users can view education via profile visibility"
  ON public.education
  FOR SELECT
  TO authenticated
  USING (
    public.can_view_profile(user_id)
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = education.profile_id
        AND p.user_id = education.user_id
        AND p.profile_visibility = 'public'
    )
  );

DROP POLICY IF EXISTS "Anon can view work experience" ON public.work_experience;
CREATE POLICY "Anon can view work experience for public profiles"
  ON public.work_experience
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = work_experience.profile_id
        AND p.user_id = work_experience.user_id
        AND p.profile_visibility = 'public'
    )
  );

DROP POLICY IF EXISTS "Users can view work experience via profile visibility" ON public.work_experience;
CREATE POLICY "Users can view work experience via profile visibility"
  ON public.work_experience
  FOR SELECT
  TO authenticated
  USING (
    public.can_view_profile(user_id)
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = work_experience.profile_id
        AND p.user_id = work_experience.user_id
        AND p.profile_visibility = 'public'
    )
  );

-- Remove direct client-side row reads from referrals so referred_email cannot be exposed by RLS
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Referrers can view their referrals" ON public.referrals;
DROP POLICY IF EXISTS "Referred users can view their referral after joining" ON public.referrals;

DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can create limited referrals" ON public.referrals;
CREATE POLICY "Authenticated users can create limited referrals"
  ON public.referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = referrer_id
    AND referred_id IS NULL
    AND completed_at IS NULL
    AND status = 'pending'
    AND reward_credits BETWEEN 0 AND 50
    AND (
      SELECT count(*)
      FROM public.referrals r
      WHERE r.referrer_id = auth.uid()
        AND r.status = 'pending'
    ) < 10
  );

DROP POLICY IF EXISTS "System can update referrals" ON public.referrals;
DROP POLICY IF EXISTS "Referrers and admins can update referrals" ON public.referrals;
CREATE POLICY "Admins can update referrals"
  ON public.referrals
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Safe referral read endpoint: returns only non-PII fields for the current user
CREATE OR REPLACE FUNCTION public.get_my_referrals_safe()
RETURNS TABLE(
  id uuid,
  referrer_id uuid,
  referred_id uuid,
  referred_type text,
  status text,
  reward_credits integer,
  created_at timestamp with time zone,
  completed_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.referrer_id,
    r.referred_id,
    r.referred_type,
    r.status,
    r.reward_credits,
    r.created_at,
    r.completed_at
  FROM public.referrals r
  WHERE auth.uid() IS NOT NULL
    AND (
      r.referrer_id = auth.uid()
      OR r.referred_id = auth.uid()
      OR r.referrer_id IN (
        SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
      )
    )
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_referrals_safe() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_referrals_safe() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_referrals_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_referrals_safe() TO service_role;

-- Keep table privileges aligned with the no-direct-read model for referral PII
REVOKE SELECT ON public.referrals FROM anon, authenticated;
GRANT SELECT (id, referrer_id, referred_id, referred_type, status, reward_credits, completed_at, created_at) ON public.referrals TO service_role;
GRANT INSERT ON public.referrals TO authenticated;
GRANT UPDATE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;