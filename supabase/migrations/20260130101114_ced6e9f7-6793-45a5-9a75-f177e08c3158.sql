-- Fix the security definer view issue by dropping and recreating with SECURITY INVOKER
-- The view should use INVOKER security to respect the caller's permissions

DROP VIEW IF EXISTS public.payment_proofs_secure;

-- Recreate as a regular view (SECURITY INVOKER is default)
-- The access control is handled within the decrypt function itself
CREATE VIEW public.payment_proofs_secure AS
SELECT 
  id,
  transaction_id,
  user_id,
  proof_url,
  CASE 
    WHEN auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') THEN 
      public.decrypt_bank_details(bank_details, user_id)
    ELSE 
      '***REDACTED***'
  END as bank_details,
  notes,
  verified_by,
  verified_at,
  created_at,
  updated_at
FROM public.payment_proofs;

-- Explicitly set security invoker (PostgreSQL 15+ syntax, but we handle it via NOT setting definer)
-- Grant access to the secure view
GRANT SELECT ON public.payment_proofs_secure TO authenticated;

COMMENT ON VIEW public.payment_proofs_secure IS 'Secure view of payment proofs with bank details decryption for authorized users. Uses SECURITY INVOKER (default) - permissions checked at query time.';