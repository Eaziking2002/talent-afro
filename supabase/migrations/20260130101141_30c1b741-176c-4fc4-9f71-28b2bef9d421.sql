-- Remove the view that's causing the security definer warning
-- Instead, we'll use an RPC function for secure access to decrypted bank details

DROP VIEW IF EXISTS public.payment_proofs_secure;

-- Create a secure RPC function that returns payment proofs with decrypted bank details
-- Only accessible by admins or the owner of the proof
CREATE OR REPLACE FUNCTION public.get_payment_proof_with_details(p_proof_id UUID)
RETURNS TABLE (
  id UUID,
  transaction_id UUID,
  user_id UUID,
  proof_url TEXT,
  bank_details TEXT,
  notes TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_proof_user_id UUID;
  v_key TEXT;
BEGIN
  -- Get the user_id of the proof to check authorization
  SELECT pp.user_id INTO v_proof_user_id
  FROM payment_proofs pp
  WHERE pp.id = p_proof_id;
  
  -- Verify authorization: must be owner or admin
  IF v_proof_user_id IS NULL THEN
    RAISE EXCEPTION 'Payment proof not found';
  END IF;
  
  IF auth.uid() != v_proof_user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized access to payment proof';
  END IF;
  
  -- Get encryption key
  v_key := current_setting('app.encryption_key', true);
  IF v_key IS NULL OR v_key = '' THEN
    v_key := encode(extensions.digest('payment_proof_encryption_salt_v1', 'sha256'), 'hex');
  END IF;
  
  RETURN QUERY
  SELECT 
    pp.id,
    pp.transaction_id,
    pp.user_id,
    pp.proof_url,
    CASE 
      WHEN pp.bank_details IS NULL OR pp.bank_details = '' THEN NULL
      ELSE 
        COALESCE(
          convert_from(
            extensions.decrypt(
              decode(pp.bank_details, 'base64'),
              convert_to(v_key, 'UTF8'),
              'aes-cbc/pad:pkcs'
            ),
            'UTF8'
          ),
          pp.bank_details -- Return original if decryption fails (legacy unencrypted data)
        )
    END as bank_details,
    pp.notes,
    pp.verified_by,
    pp.verified_at,
    pp.created_at,
    pp.updated_at
  FROM payment_proofs pp
  WHERE pp.id = p_proof_id;
EXCEPTION
  WHEN OTHERS THEN
    -- If decryption fails, return with masked bank details
    RETURN QUERY
    SELECT 
      pp.id,
      pp.transaction_id,
      pp.user_id,
      pp.proof_url,
      '***ENCRYPTED***'::TEXT as bank_details,
      pp.notes,
      pp.verified_by,
      pp.verified_at,
      pp.created_at,
      pp.updated_at
    FROM payment_proofs pp
    WHERE pp.id = p_proof_id;
END;
$$;

-- Create function to get all payment proofs for admin (without exposing bank details in list view)
CREATE OR REPLACE FUNCTION public.get_pending_payment_proofs()
RETURNS TABLE (
  id UUID,
  transaction_id UUID,
  user_id UUID,
  proof_url TEXT,
  has_bank_details BOOLEAN,
  notes TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    pp.id,
    pp.transaction_id,
    pp.user_id,
    pp.proof_url,
    (pp.bank_details IS NOT NULL AND pp.bank_details != '') as has_bank_details,
    pp.notes,
    pp.verified_by,
    pp.verified_at,
    pp.created_at,
    pp.updated_at
  FROM payment_proofs pp
  WHERE pp.verified_at IS NULL
  ORDER BY pp.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_payment_proof_with_details IS 'Securely retrieves a payment proof with decrypted bank details - only accessible by owner or admin';
COMMENT ON FUNCTION public.get_pending_payment_proofs IS 'Returns list of pending payment proofs for admin verification - bank details not included in list view';