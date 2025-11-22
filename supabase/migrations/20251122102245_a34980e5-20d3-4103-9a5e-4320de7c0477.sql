-- Fix function search paths for security
-- Recreate handle_updated_at function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  new.updated_at = now();
  return new;
END;
$$;

-- Ensure all existing functions have proper search_path set
-- This fixes the "Function Search Path Mutable" security warning