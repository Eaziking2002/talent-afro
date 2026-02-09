
-- Fix: Allow authenticated users to insert their OWN role during signup
-- This is critical - without this, new signups silently fail to assign a role
CREATE POLICY "Users can insert their own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
