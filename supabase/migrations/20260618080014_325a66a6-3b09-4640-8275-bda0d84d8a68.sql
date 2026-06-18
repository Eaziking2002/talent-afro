
CREATE OR REPLACE FUNCTION public.wallet_atomic_debit(p_user_id uuid, p_amount bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.wallets
  SET balance_minor_units = balance_minor_units - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
    AND balance_minor_units >= p_amount;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.wallet_atomic_debit(uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_atomic_debit(uuid, bigint) TO service_role;
