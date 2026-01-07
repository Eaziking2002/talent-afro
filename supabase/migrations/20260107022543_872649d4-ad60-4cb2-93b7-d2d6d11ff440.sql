-- Drop old permissive policies
DROP POLICY IF EXISTS "Employers can view applicant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users with active contracts can view full profile" ON public.profiles;

-- Create stricter employer policy - only pending/accepted applications
CREATE POLICY "Employers can view active applicant profiles"
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
    AND a.status IN ('pending', 'accepted')
  )
);

-- Create stricter contract policy - only active contracts
CREATE POLICY "Active contract parties can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_active_contract_with(user_id)
);