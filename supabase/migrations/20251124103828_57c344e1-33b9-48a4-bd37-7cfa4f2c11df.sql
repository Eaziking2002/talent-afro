-- Create contract negotiations table
CREATE TABLE public.contract_negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL,
  talent_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered')),
  proposed_amount_minor_units BIGINT NOT NULL,
  proposed_terms TEXT,
  proposed_milestones JSONB,
  counter_offer_amount_minor_units BIGINT,
  counter_offer_terms TEXT,
  counter_offer_milestones JSONB,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create negotiation messages table for live chat
CREATE TABLE public.negotiation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id UUID NOT NULL REFERENCES public.contract_negotiations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contract_negotiations
CREATE POLICY "Negotiation parties can view negotiations"
  ON public.contract_negotiations FOR SELECT
  USING (auth.uid() = employer_id OR auth.uid() = talent_id);

CREATE POLICY "Employers can create negotiations"
  ON public.contract_negotiations FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Negotiation parties can update negotiations"
  ON public.contract_negotiations FOR UPDATE
  USING (auth.uid() = employer_id OR auth.uid() = talent_id);

-- RLS Policies for negotiation_messages
CREATE POLICY "Negotiation parties can view messages"
  ON public.negotiation_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.contract_negotiations
    WHERE contract_negotiations.id = negotiation_messages.negotiation_id
    AND (contract_negotiations.employer_id = auth.uid() OR contract_negotiations.talent_id = auth.uid())
  ));

CREATE POLICY "Negotiation parties can send messages"
  ON public.negotiation_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Add indexes
CREATE INDEX idx_contract_negotiations_job ON public.contract_negotiations(job_id);
CREATE INDEX idx_contract_negotiations_employer ON public.contract_negotiations(employer_id);
CREATE INDEX idx_contract_negotiations_talent ON public.contract_negotiations(talent_id);
CREATE INDEX idx_contract_negotiations_status ON public.contract_negotiations(status);
CREATE INDEX idx_negotiation_messages_negotiation ON public.negotiation_messages(negotiation_id);
CREATE INDEX idx_negotiation_messages_created ON public.negotiation_messages(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_contract_negotiations_updated_at
  BEFORE UPDATE ON public.contract_negotiations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for negotiation tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_negotiations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiation_messages;