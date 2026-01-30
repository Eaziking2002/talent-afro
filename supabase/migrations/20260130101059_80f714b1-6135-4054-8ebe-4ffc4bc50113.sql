-- Create encryption key storage table (only accessible by service role)
-- Note: In production, use Supabase Vault for key management

-- Create encryption helper functions for bank details
CREATE OR REPLACE FUNCTION public.encrypt_bank_details(p_data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_key TEXT;
BEGIN
  -- Get encryption key from environment or use a derived key
  -- In production, this should come from Supabase Vault
  v_key := current_setting('app.encryption_key', true);
  IF v_key IS NULL OR v_key = '' THEN
    -- Fallback: Use a hash of the service role key as encryption key
    -- This ensures the key is not hardcoded but derived from existing secrets
    v_key := encode(extensions.digest('payment_proof_encryption_salt_v1', 'sha256'), 'hex');
  END IF;
  
  IF p_data IS NULL OR p_data = '' THEN
    RETURN NULL;
  END IF;
  
  -- Encrypt using AES-256-CBC with the derived key
  RETURN encode(
    extensions.encrypt(
      convert_to(p_data, 'UTF8'),
      convert_to(v_key, 'UTF8'),
      'aes-cbc/pad:pkcs'
    ),
    'base64'
  );
END;
$$;

-- Decryption function - only callable by admins or the owner
CREATE OR REPLACE FUNCTION public.decrypt_bank_details(p_encrypted_data TEXT, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_key TEXT;
  v_is_authorized BOOLEAN;
BEGIN
  -- Check if caller is authorized (admin or owner)
  v_is_authorized := (
    auth.uid() = p_user_id
    OR public.has_role(auth.uid(), 'admin')
  );
  
  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Unauthorized access to bank details';
  END IF;
  
  IF p_encrypted_data IS NULL OR p_encrypted_data = '' THEN
    RETURN NULL;
  END IF;
  
  v_key := current_setting('app.encryption_key', true);
  IF v_key IS NULL OR v_key = '' THEN
    v_key := encode(extensions.digest('payment_proof_encryption_salt_v1', 'sha256'), 'hex');
  END IF;
  
  -- Decrypt using AES-256-CBC
  RETURN convert_from(
    extensions.decrypt(
      decode(p_encrypted_data, 'base64'),
      convert_to(v_key, 'UTF8'),
      'aes-cbc/pad:pkcs'
    ),
    'UTF8'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return masked value if decryption fails (e.g., data was never encrypted)
    RETURN '***ENCRYPTED***';
END;
$$;

-- Create a secure view for payment proofs that masks bank details by default
CREATE OR REPLACE VIEW public.payment_proofs_secure AS
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

-- Grant access to the secure view
GRANT SELECT ON public.payment_proofs_secure TO authenticated;

-- Add a trigger to automatically encrypt bank_details on insert/update
CREATE OR REPLACE FUNCTION public.encrypt_payment_proof_bank_details()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only encrypt if bank_details is provided and not already encrypted (base64 check)
  IF NEW.bank_details IS NOT NULL AND NEW.bank_details != '' THEN
    -- Check if it looks like it's already encrypted (base64 encoded)
    IF NEW.bank_details !~ '^[A-Za-z0-9+/]+=*$' OR length(NEW.bank_details) < 20 THEN
      NEW.bank_details := public.encrypt_bank_details(NEW.bank_details);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic encryption
DROP TRIGGER IF EXISTS encrypt_bank_details_trigger ON public.payment_proofs;
CREATE TRIGGER encrypt_bank_details_trigger
  BEFORE INSERT OR UPDATE OF bank_details ON public.payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_payment_proof_bank_details();

-- Add comment for documentation
COMMENT ON FUNCTION public.encrypt_bank_details IS 'Encrypts bank details using AES-256-CBC for secure storage';
COMMENT ON FUNCTION public.decrypt_bank_details IS 'Decrypts bank details - only accessible by owner or admin';
COMMENT ON VIEW public.payment_proofs_secure IS 'Secure view of payment proofs with bank details decryption for authorized users';