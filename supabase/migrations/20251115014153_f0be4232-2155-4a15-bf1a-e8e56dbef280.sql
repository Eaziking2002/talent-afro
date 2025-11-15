-- Add commission tracking and payment provider fields to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS platform_fee_minor_units INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount_minor_units INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'flutterwave',
ADD COLUMN IF NOT EXISTS external_reference TEXT,
ADD COLUMN IF NOT EXISTS payment_metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for external reference lookups
CREATE INDEX IF NOT EXISTS idx_transactions_external_reference ON public.transactions(external_reference);

-- Create index for payment provider
CREATE INDEX IF NOT EXISTS idx_transactions_payment_provider ON public.transactions(payment_provider);

-- Add comment explaining the fee structure
COMMENT ON COLUMN public.transactions.platform_fee_minor_units IS 'Platform commission fee in minor units (e.g., cents)';
COMMENT ON COLUMN public.transactions.net_amount_minor_units IS 'Net amount after fees in minor units';
COMMENT ON COLUMN public.transactions.external_reference IS 'External payment provider transaction ID';
COMMENT ON COLUMN public.transactions.payment_metadata IS 'Additional payment provider specific metadata';