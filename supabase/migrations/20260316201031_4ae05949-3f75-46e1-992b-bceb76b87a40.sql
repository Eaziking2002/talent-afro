-- Allow anyone (including anon) to view public profiles
CREATE POLICY "Anyone can view public profiles"
ON public.profiles
FOR SELECT
TO anon
USING (profile_visibility = 'public');

-- Allow authenticated users to view public profiles (in addition to can_view_profile)
CREATE POLICY "Authenticated can view public profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (profile_visibility = 'public');
