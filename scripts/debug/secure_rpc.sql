-- IMOBZY - SECURITY FIX: RESTRICT RPC FUNCTIONS
-- This script restricts the powerful exec_sql function to service_role only.

-- 1. Revoke public execution of exec_sql
REVOKE EXECUTE ON FUNCTION exec_sql(TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION exec_sql(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION exec_sql(TEXT) FROM authenticated;

-- 2. Ensure only service_role (and super admins/postgres) can run it
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;

-- 3. Verify other RPC functions (optional but recommended)
-- Example: get_tenant_by_domain stays public as it's needed for the website
GRANT EXECUTE ON FUNCTION get_tenant_by_domain(TEXT) TO anon, authenticated, service_role;

-- 4. Restrict is_superadmin to authenticated users
REVOKE EXECUTE ON FUNCTION is_superadmin(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION is_superadmin(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION is_superadmin(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION exec_sql(TEXT) IS 'Dangerous: Executes raw SQL. Restricted to service_role only.';
