-- Move internal employer verification review data out of the public employer profile table
CREATE TABLE IF NOT EXISTS public.employer_verification_private (
  employer_id uuid PRIMARY KEY REFERENCES public.employers(id) ON DELETE CASCADE,
  verification_date timestamp with time zone,
  verified_by uuid,
  verification_notes text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.employer_verification_private TO service_role;
ALTER TABLE public.employer_verification_private ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No client access to employer verification private" ON public.employer_verification_private;
CREATE POLICY "No client access to employer verification private"
  ON public.employer_verification_private
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

INSERT INTO public.employer_verification_private (employer_id, verification_date, verified_by, verification_notes)
SELECT id, verification_date, verified_by, verification_notes
FROM public.employers
WHERE verification_date IS NOT NULL
   OR verified_by IS NOT NULL
   OR verification_notes IS NOT NULL
ON CONFLICT (employer_id) DO UPDATE SET
  verification_date = EXCLUDED.verification_date,
  verified_by = EXCLUDED.verified_by,
  verification_notes = EXCLUDED.verification_notes,
  updated_at = now();

DROP FUNCTION IF EXISTS public.get_employers_admin();
CREATE OR REPLACE FUNCTION public.get_employers_admin()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  company_name text,
  company_description text,
  website text,
  verified boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  trust_score integer,
  verification_level text,
  verification_date timestamp with time zone,
  verified_by uuid,
  total_jobs_posted integer,
  successful_hires integer,
  verification_notes text,
  average_rating numeric,
  total_reviews integer,
  last_active_at timestamp with time zone,
  logo_url text,
  industry text,
  company_size text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.user_id,
    e.company_name,
    e.company_description,
    e.website,
    e.verified,
    e.created_at,
    e.updated_at,
    e.trust_score,
    e.verification_level,
    evp.verification_date,
    evp.verified_by,
    e.total_jobs_posted,
    e.successful_hires,
    evp.verification_notes,
    e.average_rating,
    e.total_reviews,
    e.last_active_at,
    e.logo_url,
    e.industry,
    e.company_size
  FROM public.employers e
  LEFT JOIN public.employer_verification_private evp ON evp.employer_id = e.id
  ORDER BY e.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.get_employers_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_employers_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_employers_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employers_admin() TO service_role;

DROP FUNCTION IF EXISTS public.update_employer_verification(uuid, boolean, text, text);
CREATE OR REPLACE FUNCTION public.update_employer_verification(
  p_employer_id uuid,
  p_verified boolean,
  p_verification_level text,
  p_verification_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_verification_level NOT IN ('unverified', 'basic', 'verified', 'premium') THEN
    RAISE EXCEPTION 'Invalid verification level';
  END IF;

  UPDATE public.employers
  SET
    verified = p_verified,
    verification_level = p_verification_level,
    updated_at = now()
  WHERE id = p_employer_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 1 THEN
    INSERT INTO public.employer_verification_private (
      employer_id,
      verification_date,
      verified_by,
      verification_notes,
      updated_at
    ) VALUES (
      p_employer_id,
      CASE WHEN p_verified THEN now() ELSE NULL END,
      CASE WHEN p_verified THEN auth.uid() ELSE NULL END,
      NULLIF(left(coalesce(p_verification_notes, ''), 2000), ''),
      now()
    )
    ON CONFLICT (employer_id) DO UPDATE SET
      verification_date = EXCLUDED.verification_date,
      verified_by = EXCLUDED.verified_by,
      verification_notes = EXCLUDED.verification_notes,
      updated_at = now();
  END IF;

  RETURN v_updated = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.update_employer_verification(uuid, boolean, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_employer_verification(uuid, boolean, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_employer_verification(uuid, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_employer_verification(uuid, boolean, text, text) TO service_role;

ALTER TABLE public.employers
  DROP COLUMN IF EXISTS verification_date,
  DROP COLUMN IF EXISTS verified_by,
  DROP COLUMN IF EXISTS verification_notes;

-- Re-apply public employer profile read grants after internal columns are removed
REVOKE SELECT ON public.employers FROM anon, authenticated;
GRANT SELECT (
  id,
  user_id,
  company_name,
  company_description,
  website,
  verified,
  created_at,
  updated_at,
  trust_score,
  verification_level,
  total_jobs_posted,
  successful_hires,
  average_rating,
  total_reviews,
  last_active_at,
  logo_url,
  industry,
  company_size
) ON public.employers TO anon, authenticated;
GRANT ALL ON public.employers TO service_role;

-- Referral summaries should not expose the joined referred user ID to referrers
DROP FUNCTION IF EXISTS public.get_my_referrals_safe();
CREATE OR REPLACE FUNCTION public.get_my_referrals_safe()
RETURNS TABLE(
  id uuid,
  referrer_id uuid,
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
    r.referred_type,
    r.status,
    r.reward_credits,
    r.created_at,
    r.completed_at
  FROM public.referrals r
  WHERE auth.uid() IS NOT NULL
    AND r.referrer_id = auth.uid()
  ORDER BY r.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_my_referrals_safe() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_referrals_safe() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_referrals_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_referrals_safe() TO service_role;