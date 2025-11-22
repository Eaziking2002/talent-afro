-- Add payment proof storage and manual payment support
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  proof_url TEXT NOT NULL,
  bank_details TEXT,
  notes TEXT,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- Users can upload their own payment proofs
CREATE POLICY "Users can insert their payment proofs"
ON public.payment_proofs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own payment proofs
CREATE POLICY "Users can view their payment proofs"
ON public.payment_proofs FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = verified_by);

-- Admins can update payment proofs (verify them)
CREATE POLICY "Admins can verify payment proofs"
ON public.payment_proofs FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payment proofs
CREATE POLICY "Users can upload payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role))
);

-- Add trigger for updated_at
CREATE TRIGGER update_payment_proofs_updated_at
BEFORE UPDATE ON public.payment_proofs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();