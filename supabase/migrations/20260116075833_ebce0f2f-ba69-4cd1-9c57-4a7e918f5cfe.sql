
-- Fix 1: dispute_escalations - Only allow inserts from edge functions (service role) or admins
DROP POLICY IF EXISTS "System can create escalations" ON public.dispute_escalations;
CREATE POLICY "Admins and system can create escalations"
ON public.dispute_escalations
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 2: job_matches - Only allow inserts from authenticated users for their own matches or admins
DROP POLICY IF EXISTS "System can create matches" ON public.job_matches;
CREATE POLICY "System creates matches via service role"
ON public.job_matches
FOR INSERT
TO authenticated
WITH CHECK (
  -- Talents can have matches created for them, or admins can create
  EXISTS (SELECT 1 FROM profiles WHERE id = job_matches.talent_id AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 3: job_views - Allow authenticated users to log views, require valid job_id
DROP POLICY IF EXISTS "Anyone can insert job views" ON public.job_views;
CREATE POLICY "Users can log job views"
ON public.job_views
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only log their own views (or anonymous with null user_id)
  (user_id IS NULL OR user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM jobs WHERE id = job_views.job_id)
);

-- Also allow anon for public job views
CREATE POLICY "Anonymous can log job views"
ON public.job_views
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
  AND EXISTS (SELECT 1 FROM jobs WHERE id = job_views.job_id)
);

-- Fix 4: milestone_reminders - Only admins or contract parties can manage
DROP POLICY IF EXISTS "System can manage reminders" ON public.milestone_reminders;
CREATE POLICY "Contract parties can manage reminders"
ON public.milestone_reminders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM milestones m
    JOIN contracts c ON m.contract_id = c.id
    WHERE m.id = milestone_reminders.milestone_id
    AND (c.employer_id = auth.uid() OR c.talent_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM milestones m
    JOIN contracts c ON m.contract_id = c.id
    WHERE m.id = milestone_reminders.milestone_id
    AND (c.employer_id = auth.uid() OR c.talent_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 5: notifications - Users can only create notifications for themselves or admins can create any
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Users receive their own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 6: referrals - Only the referrer can update their referrals or admins
DROP POLICY IF EXISTS "System can update referrals" ON public.referrals;
CREATE POLICY "Referrers and admins can update referrals"
ON public.referrals
FOR UPDATE
TO authenticated
USING (
  referrer_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  referrer_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 7: transactions - Only parties to the transaction can create, or admins
DROP POLICY IF EXISTS "System can create transactions" ON public.transactions;
CREATE POLICY "Transaction parties can create"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  from_user_id = auth.uid()
  OR to_user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);
