-- Allow users to read only their own referral status rows; invite emails live in the private table
DROP POLICY IF EXISTS "Referrers can view safe referral rows" ON public.referrals;
CREATE POLICY "Referrers can view safe referral rows"
  ON public.referrals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id);
GRANT SELECT (id, referrer_id, referred_type, status, reward_credits, created_at, completed_at) ON public.referrals TO authenticated;
REVOKE SELECT (referred_id) ON public.referrals FROM anon, authenticated;

-- Defense-in-depth for private invite contact emails
REVOKE ALL ON public.referral_invite_contacts FROM anon, authenticated;
REVOKE SELECT (referred_email) ON public.referral_invite_contacts FROM anon, authenticated;
GRANT ALL ON public.referral_invite_contacts TO service_role;

-- Restrict certification verification to admins or employers with a legitimate talent relationship
DROP POLICY IF EXISTS "Employers can verify certifications" ON public.certifications;
CREATE POLICY "Authorized employers can verify certifications"
  ON public.certifications
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.contracts c ON c.talent_id = p.user_id
      JOIN public.employers e ON e.user_id = auth.uid()
      WHERE p.id = certifications.talent_id
        AND c.employer_id = e.user_id
        AND c.status IN ('active', 'completed')
    )
    OR EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      JOIN public.employers e ON e.id = j.employer_id
      WHERE a.applicant_id = certifications.talent_id
        AND e.user_id = auth.uid()
        AND a.status IN ('pending'::application_status, 'accepted'::application_status)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.contracts c ON c.talent_id = p.user_id
      JOIN public.employers e ON e.user_id = auth.uid()
      WHERE p.id = certifications.talent_id
        AND c.employer_id = e.user_id
        AND c.status IN ('active', 'completed')
    )
    OR EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      JOIN public.employers e ON e.id = j.employer_id
      WHERE a.applicant_id = certifications.talent_id
        AND e.user_id = auth.uid()
        AND a.status IN ('pending'::application_status, 'accepted'::application_status)
    )
  );