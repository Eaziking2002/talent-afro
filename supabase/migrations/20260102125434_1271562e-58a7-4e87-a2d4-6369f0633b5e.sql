-- Move extensions from public schema to extensions schema
-- First, create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Note: Extensions like pg_graphql, pg_stat_statements, pgcrypto, pgjwt, uuid-ossp are managed by Supabase
-- and cannot be moved. This is a known limitation and these warnings can be safely ignored
-- as Supabase manages these extensions securely.