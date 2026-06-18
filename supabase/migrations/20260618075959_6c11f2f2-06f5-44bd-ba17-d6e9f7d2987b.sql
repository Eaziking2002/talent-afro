
-- ============================================================
-- 1. user_roles: prevent self-assigning admin/moderator
-- ============================================================
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

CREATE POLICY "Users can self-assign non-privileged roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('talent'::app_role, 'employer'::app_role)
);

CREATE POLICY "Admins can assign any role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 2. wallets: drop ALL policy, allow SELECT only for owner
-- ============================================================
DROP POLICY IF EXISTS "Owner only wallet access" ON public.wallets;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='wallets'
      AND policyname='Users can view their own wallet'
  ) THEN
    CREATE POLICY "Users can view their own wallet"
      ON public.wallets FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- ============================================================
-- 3. application_status_history: remove permissive INSERT
-- (trigger handle_application_status_change is SECURITY DEFINER
--  and bypasses RLS, so audit rows still get written)
-- ============================================================
DROP POLICY IF EXISTS "System inserts history" ON public.application_status_history;

-- ============================================================
-- 4. contract_amendments: ensure user is a party
-- ============================================================
DROP POLICY IF EXISTS "Contract parties can propose amendments" ON public.contract_amendments;

CREATE POLICY "Contract parties can propose amendments"
ON public.contract_amendments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = proposed_by
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_amendments.contract_id
      AND (c.employer_id = auth.uid() OR c.talent_id = auth.uid())
  )
);

-- ============================================================
-- 5. deliverables: ensure submitter is talent on the contract
-- ============================================================
DROP POLICY IF EXISTS "Talents can submit deliverables" ON public.deliverables;

CREATE POLICY "Talents can submit deliverables"
ON public.deliverables
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = submitted_by
  AND EXISTS (
    SELECT 1 FROM public.milestones m
    JOIN public.contracts c ON c.id = m.contract_id
    WHERE m.id = deliverables.milestone_id
      AND c.talent_id = auth.uid()
  )
);

-- ============================================================
-- 6. disputes: ensure raiser is a party to the contract
-- ============================================================
DROP POLICY IF EXISTS "Contract parties can create disputes" ON public.disputes;

CREATE POLICY "Contract parties can create disputes"
ON public.disputes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = raised_by
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = disputes.contract_id
      AND (c.employer_id = auth.uid() OR c.talent_id = auth.uid())
  )
);

-- ============================================================
-- 7. negotiation_messages: ensure sender is a party
-- ============================================================
DROP POLICY IF EXISTS "Negotiation parties can send messages" ON public.negotiation_messages;

CREATE POLICY "Negotiation parties can send messages"
ON public.negotiation_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.contract_negotiations n
    WHERE n.id = negotiation_messages.negotiation_id
      AND (n.employer_id = auth.uid() OR n.talent_id = auth.uid())
  )
);

-- ============================================================
-- 8. contract_templates: fix ownership check to use employers
-- ============================================================
DROP POLICY IF EXISTS "Employers can create templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Employers can delete their templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Employers can update their templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Employers can view their own templates" ON public.contract_templates;

CREATE POLICY "Employers can view their own templates"
ON public.contract_templates FOR SELECT TO authenticated
USING (
  auth.uid() IN (
    SELECT e.user_id FROM public.employers e
    WHERE e.id = contract_templates.employer_id
  )
);

CREATE POLICY "Employers can create templates"
ON public.contract_templates FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT e.user_id FROM public.employers e
    WHERE e.id = contract_templates.employer_id
  )
);

CREATE POLICY "Employers can update their templates"
ON public.contract_templates FOR UPDATE TO authenticated
USING (
  auth.uid() IN (
    SELECT e.user_id FROM public.employers e
    WHERE e.id = contract_templates.employer_id
  )
);

CREATE POLICY "Employers can delete their templates"
ON public.contract_templates FOR DELETE TO authenticated
USING (
  auth.uid() IN (
    SELECT e.user_id FROM public.employers e
    WHERE e.id = contract_templates.employer_id
  )
);

-- ============================================================
-- 9. storage: payment-proofs UPDATE/DELETE owner-only
-- ============================================================
DROP POLICY IF EXISTS "Users can update their payment proofs" ON storage.objects;
CREATE POLICY "Users can update their payment proofs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their payment proofs" ON storage.objects;
CREATE POLICY "Users can delete their payment proofs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- ============================================================
-- 10. realtime.messages: default-deny RLS
-- Users must use postgres_changes (which respects table RLS).
-- Direct broadcast/presence channel subscriptions are denied
-- unless explicitly allowed by a future authorization policy.
-- ============================================================
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Default deny realtime messages" ON realtime.messages;
CREATE POLICY "Default deny realtime messages"
ON realtime.messages
AS RESTRICTIVE
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);
