-- Add file attachment support to contract messages
ALTER TABLE contract_messages
ADD COLUMN file_url TEXT,
ADD COLUMN file_name TEXT,
ADD COLUMN file_type TEXT;

-- Create storage bucket for contract files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-files',
  'contract-files',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'application/zip']
);

-- RLS policies for contract files bucket
CREATE POLICY "Contract parties can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contract-files' AND
  EXISTS (
    SELECT 1 FROM contracts
    WHERE id::text = (storage.foldername(name))[1]
    AND (employer_id = auth.uid() OR talent_id = auth.uid())
  )
);

CREATE POLICY "Contract parties can view files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contract-files' AND
  EXISTS (
    SELECT 1 FROM contracts
    WHERE id::text = (storage.foldername(name))[1]
    AND (employer_id = auth.uid() OR talent_id = auth.uid())
  )
);

CREATE POLICY "Contract parties can delete files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contract-files' AND
  EXISTS (
    SELECT 1 FROM contracts
    WHERE id::text = (storage.foldername(name))[1]
    AND (employer_id = auth.uid() OR talent_id = auth.uid())
  )
);

-- Add escrow tracking to contracts
ALTER TABLE contracts
ADD COLUMN escrow_status TEXT DEFAULT 'pending' CHECK (escrow_status IN ('pending', 'funded', 'released', 'refunded'));

-- Function to handle contract cancellation refunds
CREATE OR REPLACE FUNCTION handle_contract_cancellation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_escrow_amount BIGINT;
  v_transaction_id UUID;
BEGIN
  -- Only process if status changed to cancelled and escrow was funded
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.escrow_status = 'funded' THEN
    
    -- Calculate total unreleased milestone amounts
    SELECT COALESCE(SUM(amount_minor_units), 0) INTO v_escrow_amount
    FROM milestones
    WHERE contract_id = NEW.id AND status NOT IN ('approved', 'completed');
    
    -- Only create refund if there are unreleased funds
    IF v_escrow_amount > 0 THEN
      -- Create refund transaction
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
        'refund',
        'completed',
        NEW.talent_id,
        NEW.employer_id,
        NEW.job_id,
        v_escrow_amount,
        NEW.currency,
        'Contract cancellation refund: ' || (SELECT title FROM jobs WHERE id = NEW.job_id)
      ) RETURNING id INTO v_transaction_id;
      
      -- Update employer's wallet
      INSERT INTO wallets (user_id, balance_minor_units, currency)
      VALUES (NEW.employer_id, v_escrow_amount, NEW.currency)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance_minor_units = wallets.balance_minor_units + v_escrow_amount,
        updated_at = now();
      
      -- Update escrow status
      NEW.escrow_status := 'refunded';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for contract cancellation
CREATE TRIGGER trigger_contract_cancellation
BEFORE UPDATE ON contracts
FOR EACH ROW
EXECUTE FUNCTION handle_contract_cancellation();

-- Function to initialize escrow when contract is activated
CREATE OR REPLACE FUNCTION handle_contract_activation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- When contract moves from draft to active, create escrow transaction
  IF NEW.status = 'active' AND OLD.status = 'draft' AND NEW.escrow_status = 'pending' THEN
    
    -- Create escrow transaction
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
      'escrow',
      'completed',
      NEW.employer_id,
      NEW.talent_id,
      NEW.job_id,
      NEW.total_amount_minor_units,
      NEW.currency,
      'Escrow funding for: ' || (SELECT title FROM jobs WHERE id = NEW.job_id)
    ) RETURNING id INTO v_transaction_id;
    
    -- Update escrow status
    NEW.escrow_status := 'funded';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for contract activation
CREATE TRIGGER trigger_contract_activation
BEFORE UPDATE ON contracts
FOR EACH ROW
EXECUTE FUNCTION handle_contract_activation();