-- Store referral invite emails outside user-readable referral rows
CREATE TABLE IF NOT EXISTS public.referral_invite_contacts (
  referral_id uuid PRIMARY KEY REFERENCES public.referrals(id) ON DELETE CASCADE,
  referred_email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.referral_invite_contacts TO service_role;
ALTER TABLE public.referral_invite_contacts ENABLE ROW LEVEL SECURITY;

INSERT INTO public.referral_invite_contacts (referral_id, referred_email, created_at)
SELECT id, referred_email, COALESCE(created_at, now())
FROM public.referrals
WHERE referred_email IS NOT NULL
ON CONFLICT (referral_id) DO NOTHING;

ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referrer_id_referred_email_key;
ALTER TABLE public.referrals DROP COLUMN IF EXISTS referred_email;

-- Referral creation is now performed through a validated backend function only
DROP POLICY IF EXISTS "Authenticated users can create limited referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can create limited referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;
REVOKE INSERT ON public.referrals FROM anon, authenticated;
GRANT ALL ON public.referrals TO service_role;

CREATE OR REPLACE FUNCTION public.create_referral(p_referred_email text, p_referred_type text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_referral_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_email := lower(trim(coalesce(p_referred_email, '')));

  IF length(v_email) < 3 OR length(v_email) > 254 OR v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;

  IF p_referred_type NOT IN ('talent', 'employer') THEN
    RAISE EXCEPTION 'Invalid referral type';
  END IF;

  IF (
    SELECT count(*)
    FROM public.referrals r
    WHERE r.referrer_id = auth.uid()
      AND r.status = 'pending'
  ) >= 10 THEN
    RAISE EXCEPTION 'Referral limit reached';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.referrals r
    JOIN public.referral_invite_contacts ric ON ric.referral_id = r.id
    WHERE r.referrer_id = auth.uid()
      AND r.status = 'pending'
      AND lower(ric.referred_email) = v_email
  ) THEN
    RAISE EXCEPTION 'Referral already exists';
  END IF;

  INSERT INTO public.referrals (referrer_id, referred_type, status, reward_credits)
  VALUES (auth.uid(), p_referred_type, 'pending', 50)
  RETURNING id INTO v_referral_id;

  INSERT INTO public.referral_invite_contacts (referral_id, referred_email)
  VALUES (v_referral_id, v_email);

  RETURN v_referral_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_referral(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_referral(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_referral(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_referral(text, text) TO service_role;

-- Payment records must be produced by trusted backend workflows, not user browser inserts
DROP POLICY IF EXISTS "Transaction parties can create" ON public.transactions;
REVOKE INSERT ON public.transactions FROM anon, authenticated;
GRANT ALL ON public.transactions TO service_role;

-- Users may only initialize an empty wallet for themselves
DROP POLICY IF EXISTS "Users can create their own wallet" ON public.wallets;
CREATE POLICY "Users can create zero balance wallet"
  ON public.wallets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND balance_minor_units = 0
    AND currency = 'USD'
  );

-- Feedback is private to the submitting signed-in user; anonymous/null feedback is not broadly readable
DROP POLICY IF EXISTS "Authenticated users can submit feedback" ON public.tester_feedback;
CREATE POLICY "Authenticated users can submit own feedback"
  ON public.tester_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

DROP POLICY IF EXISTS "Users can view their own feedback" ON public.tester_feedback;
CREATE POLICY "Users can view their own feedback"
  ON public.tester_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);