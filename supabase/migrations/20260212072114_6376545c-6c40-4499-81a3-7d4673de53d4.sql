
-- Fix infinite recursion: jobs ↔ employers RLS policies

-- 1. Drop recursive policies
DROP POLICY IF EXISTS "Jobs are viewable by everyone" ON public.jobs;
DROP POLICY IF EXISTS "Employers can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Employers can update their jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can view employers with accepted business relationship" ON public.employers;
DROP POLICY IF EXISTS "Users can view own employer profile" ON public.employers;

-- 2. Helper: check if user owns an employer record (avoids querying jobs)
CREATE OR REPLACE FUNCTION public.is_employer_owner(_employer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM employers WHERE id = _employer_id AND user_id = auth.uid()
  )
$$;

-- 3. Jobs policies (no longer query employers table directly)
CREATE POLICY "Open jobs visible to all authenticated"
ON public.jobs FOR SELECT TO authenticated
USING (
  status = 'open'
  OR public.is_employer_owner(employer_id)
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Anon can view open jobs"
ON public.jobs FOR SELECT TO anon
USING (status = 'open');

CREATE POLICY "Employers can create jobs"
ON public.jobs FOR INSERT TO authenticated
WITH CHECK (public.is_employer_owner(employer_id));

CREATE POLICY "Employers can update their jobs"
ON public.jobs FOR UPDATE TO authenticated
USING (public.is_employer_owner(employer_id) OR public.has_role(auth.uid(), 'admin'));

-- 4. Employers policies (no longer query jobs table)
CREATE POLICY "Anyone can view employers"
ON public.employers FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Anon can view employers"
ON public.employers FOR SELECT TO anon
USING (true);
