
-- Add cover photo column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Create profile-images storage bucket (private, user uploads their own)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Users can upload to their own folder
CREATE POLICY "Users upload own profile images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Anyone can view profile images (they are public)
CREATE POLICY "Public view profile images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

-- Users can update/delete their own images
CREATE POLICY "Users manage own profile images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own profile images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
