-- Contract messages table for real-time chat
CREATE TABLE public.contract_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.contract_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contract parties can view contract messages"
ON public.contract_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.contracts
  WHERE contracts.id = contract_messages.contract_id
  AND (contracts.employer_id = auth.uid() OR contracts.talent_id = auth.uid())
));

CREATE POLICY "Contract parties can send messages"
ON public.contract_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.contracts
    WHERE contracts.id = contract_messages.contract_id
    AND (contracts.employer_id = auth.uid() OR contracts.talent_id = auth.uid())
  )
);

CREATE POLICY "Recipients can mark messages as read"
ON public.contract_messages FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.contracts
  WHERE contracts.id = contract_messages.contract_id
  AND (contracts.employer_id = auth.uid() OR contracts.talent_id = auth.uid())
));

-- Enable realtime for contract messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_messages;

-- Add index for better query performance
CREATE INDEX idx_contract_messages_contract_id ON public.contract_messages(contract_id);
CREATE INDEX idx_contract_messages_created_at ON public.contract_messages(created_at DESC);

-- Function to automatically release payments when milestone is approved
CREATE OR REPLACE FUNCTION handle_milestone_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_contract RECORD;
  v_transaction_id UUID;
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Get contract details
    SELECT * INTO v_contract
    FROM contracts
    WHERE id = NEW.contract_id;

    -- Create release transaction
    INSERT INTO transactions (
      type,
      status,
      from_user_id,
      to_user_id,
      job_id,
      amount_minor_units,
      currency,
      description
    ) VALUES (
      'release',
      'completed',
      v_contract.employer_id,
      v_contract.talent_id,
      v_contract.job_id,
      NEW.amount_minor_units,
      v_contract.currency,
      'Milestone payment release: ' || NEW.title
    ) RETURNING id INTO v_transaction_id;

    -- Update talent's wallet
    INSERT INTO wallets (user_id, balance_minor_units, currency)
    VALUES (v_contract.talent_id, NEW.amount_minor_units, v_contract.currency)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance_minor_units = wallets.balance_minor_units + NEW.amount_minor_units,
      updated_at = now();

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for automatic payment release
CREATE TRIGGER trigger_milestone_payment_release
AFTER UPDATE ON public.milestones
FOR EACH ROW
EXECUTE FUNCTION handle_milestone_approval();