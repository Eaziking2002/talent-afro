
-- Create identity_verifications table for dual-sided document uploads
CREATE TABLE public.identity_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('national_id', 'passport', 'drivers_license', 'business_registration', 'cv')),
  front_image_url TEXT,
  back_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own verifications
CREATE POLICY "Users can view own verifications"
  ON public.identity_verifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own verifications
CREATE POLICY "Users can create own verifications"
  ON public.identity_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending verifications
CREATE POLICY "Users can update own pending verifications"
  ON public.identity_verifications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Admins can view all verifications
CREATE POLICY "Admins can view all verifications"
  ON public.identity_verifications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update verifications (approve/reject)
CREATE POLICY "Admins can update verifications"
  ON public.identity_verifications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can delete their own pending verifications
CREATE POLICY "Users can delete own pending verifications"
  ON public.identity_verifications FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- Create updated_at trigger
CREATE TRIGGER update_identity_verifications_updated_at
  BEFORE UPDATE ON public.identity_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create private storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-docs',
  'verification-docs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
);

-- Storage: Users can upload to their own folder
CREATE POLICY "Users upload own verification docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage: Users can view their own docs
CREATE POLICY "Users view own verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Storage: Users can delete their own docs (pending only handled at app level)
CREATE POLICY "Users delete own verification docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage: Admins can view all verification docs
CREATE POLICY "Admins view all verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND public.has_role(auth.uid(), 'admin')
  );
