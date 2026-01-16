
-- STEP 8: Create safe transaction view (excludes sensitive metadata)
-- Uses correct column names: from_user_id and to_user_id
CREATE OR REPLACE VIEW public.transactions_safe AS
SELECT 
  id,
  from_user_id,
  to_user_id,
  job_id,
  type,
  status,
  amount_minor_units,
  platform_fee_minor_units,
  net_amount_minor_units,
  currency,
  description,
  created_at,
  updated_at
FROM transactions
WHERE from_user_id = auth.uid() OR to_user_id = auth.uid();

-- STEP 9: Verify wallets RLS is owner-only (drop any permissive policies)
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;
DROP POLICY IF EXISTS "System can create wallets" ON public.wallets;

CREATE POLICY "Owner only wallet access"
ON public.wallets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
