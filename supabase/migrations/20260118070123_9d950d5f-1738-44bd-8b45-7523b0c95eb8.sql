-- Create dedicated extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop pg_trgm from public and recreate in extensions schema
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION pg_trgm WITH SCHEMA extensions;

-- Grant usage on extensions schema to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO service_role;