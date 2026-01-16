
-- Fix security definer view - recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.transactions_safe;

CREATE VIEW public.transactions_safe 
WITH (security_invoker = true) AS
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
