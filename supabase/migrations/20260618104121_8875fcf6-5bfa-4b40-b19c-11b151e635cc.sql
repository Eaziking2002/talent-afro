-- Explicitly deny browser/API access to private referral invite contacts
DROP POLICY IF EXISTS "No client access to referral invite contacts" ON public.referral_invite_contacts;
CREATE POLICY "No client access to referral invite contacts"
  ON public.referral_invite_contacts
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
REVOKE ALL ON public.referral_invite_contacts FROM anon, authenticated;
REVOKE SELECT (referred_email) ON public.referral_invite_contacts FROM anon, authenticated;
GRANT ALL ON public.referral_invite_contacts TO service_role;

-- Protect internal employer verification fields with column-level API grants
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

REVOKE INSERT ON public.employers FROM anon, authenticated;
GRANT INSERT (
  user_id,
  company_name,
  company_description,
  website,
  logo_url,
  industry,
  company_size
) ON public.employers TO authenticated;

REVOKE UPDATE ON public.employers FROM anon, authenticated;
GRANT UPDATE (
  company_name,
  company_description,
  website,
  logo_url,
  industry,
  company_size,
  updated_at,
  last_active_at
) ON public.employers TO authenticated;

DROP POLICY IF EXISTS "Users can update their employer profile" ON public.employers;
CREATE POLICY "Users can update their employer profile"
  ON public.employers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin-only secure read of internal employer verification fields
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
    e.verification_date,
    e.verified_by,
    e.total_jobs_posted,
    e.successful_hires,
    e.verification_notes,
    e.average_rating,
    e.total_reviews,
    e.last_active_at,
    e.logo_url,
    e.industry,
    e.company_size
  FROM public.employers e
  ORDER BY e.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.get_employers_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_employers_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_employers_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employers_admin() TO service_role;

-- Admin-only verification mutations for protected employer columns
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
    verification_date = CASE WHEN p_verified THEN now() ELSE NULL END,
    verified_by = CASE WHEN p_verified THEN auth.uid() ELSE NULL END,
    verification_notes = NULLIF(left(coalesce(p_verification_notes, ''), 2000), ''),
    updated_at = now()
  WHERE id = p_employer_id;

  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.update_employer_verification(uuid, boolean, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_employer_verification(uuid, boolean, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_employer_verification(uuid, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_employer_verification(uuid, boolean, text, text) TO service_role;