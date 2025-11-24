-- Create referrals table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID,
  referred_email TEXT NOT NULL,
  referred_type TEXT NOT NULL CHECK (referred_type IN ('talent', 'employer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  reward_credits INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referrer_id, referred_email)
);

-- Create certifications table
CREATE TABLE public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  certificate_name TEXT NOT NULL,
  certificate_url TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create skill assessments table
CREATE TABLE public.skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  assessment_score INTEGER NOT NULL CHECK (assessment_score >= 0 AND assessment_score <= 100),
  assessment_notes TEXT,
  assessed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create contract amendments table
CREATE TABLE public.contract_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL,
  amendment_type TEXT NOT NULL CHECK (amendment_type IN ('terms', 'milestone', 'budget', 'duration')),
  amendment_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create dispute escalations table
CREATE TABLE public.dispute_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  escalated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  escalated_to UUID,
  escalation_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create milestone reminders table
CREATE TABLE public.milestone_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h_before', 'overdue')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(milestone_id, reminder_type)
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
CREATE POLICY "Users can view their own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can create referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "System can update referrals"
  ON public.referrals FOR UPDATE
  USING (true);

-- RLS Policies for certifications
CREATE POLICY "Talents can manage their certifications"
  ON public.certifications FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = certifications.talent_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Everyone can view certifications"
  ON public.certifications FOR SELECT
  USING (true);

CREATE POLICY "Employers can verify certifications"
  ON public.certifications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.employers
    WHERE employers.user_id = auth.uid()
  ));

-- RLS Policies for skill assessments
CREATE POLICY "Talents can view their assessments"
  ON public.skill_assessments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = skill_assessments.talent_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Employers can create assessments"
  ON public.skill_assessments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.employers
    WHERE employers.user_id = auth.uid()
  ));

CREATE POLICY "Everyone can view assessments"
  ON public.skill_assessments FOR SELECT
  USING (true);

-- RLS Policies for contract amendments
CREATE POLICY "Contract parties can view amendments"
  ON public.contract_amendments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.contracts
    WHERE contracts.id = contract_amendments.contract_id
    AND (contracts.employer_id = auth.uid() OR contracts.talent_id = auth.uid())
  ));

CREATE POLICY "Contract parties can propose amendments"
  ON public.contract_amendments FOR INSERT
  WITH CHECK (auth.uid() = proposed_by);

CREATE POLICY "Contract parties can approve amendments"
  ON public.contract_amendments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.contracts
    WHERE contracts.id = contract_amendments.contract_id
    AND (contracts.employer_id = auth.uid() OR contracts.talent_id = auth.uid())
  ));

-- RLS Policies for dispute escalations
CREATE POLICY "Admins can view all escalations"
  ON public.dispute_escalations FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Contract parties can view their dispute escalations"
  ON public.dispute_escalations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.disputes d
    JOIN public.contracts c ON d.contract_id = c.id
    WHERE d.id = dispute_escalations.dispute_id
    AND (c.employer_id = auth.uid() OR c.talent_id = auth.uid())
  ));

CREATE POLICY "System can create escalations"
  ON public.dispute_escalations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update escalations"
  ON public.dispute_escalations FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for milestone reminders
CREATE POLICY "Contract parties can view milestone reminders"
  ON public.milestone_reminders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.milestones m
    JOIN public.contracts c ON m.contract_id = c.id
    WHERE m.id = milestone_reminders.milestone_id
    AND (c.employer_id = auth.uid() OR c.talent_id = auth.uid())
  ));

CREATE POLICY "System can manage reminders"
  ON public.milestone_reminders FOR ALL
  USING (true);

-- Add indexes
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_certifications_talent ON public.certifications(talent_id);
CREATE INDEX idx_skill_assessments_talent ON public.skill_assessments(talent_id);
CREATE INDEX idx_contract_amendments_contract ON public.contract_amendments(contract_id);
CREATE INDEX idx_contract_amendments_status ON public.contract_amendments(status);
CREATE INDEX idx_dispute_escalations_dispute ON public.dispute_escalations(dispute_id);
CREATE INDEX idx_milestone_reminders_milestone ON public.milestone_reminders(milestone_id);

-- Add updated_at triggers
CREATE TRIGGER update_certifications_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_contract_amendments_updated_at
  BEFORE UPDATE ON public.contract_amendments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();