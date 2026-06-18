
CREATE OR REPLACE FUNCTION public.find_profile_id_by_email(p_email text)
RETURNS TABLE(profile_id uuid, user_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.user_id
  FROM profile_private pp
  JOIN profiles p ON p.user_id = pp.user_id
  WHERE lower(pp.email) = lower(p_email)
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.find_profile_id_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_profile_id_by_email(text) TO authenticated;
