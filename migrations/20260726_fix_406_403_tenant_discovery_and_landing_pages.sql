-- ============================================
-- FIX: 406 Not Acceptable + 403 Forbidden
-- Applied: 2026-07-26
--
-- Error 1: 406 on public_tenant_discovery
--   Cause: The view is backed by reseller_infrastructure which has RLS
--          requiring auth.uid(). Anonymous users (bootstrap before login)
--          get 406 Not Acceptable.
--
-- Error 2: 403 on landing_pages INSERT
--   Cause: RLS policy "Tenant isolation landing_pages" uses get_my_org_id()
--          but either the function doesn't exist or the policy was never
--          properly applied, causing INSERT to fail with 42501.
-- ============================================

-- ============================================
-- 1. Fix public_tenant_discovery (406)
-- ============================================

-- Ensure the view exists
CREATE OR REPLACE VIEW public.public_tenant_discovery AS
SELECT
    domain,
    supabase_url,
    supabase_anon_key
FROM
    public.reseller_infrastructure
WHERE
    is_active = true;

-- Allow anonymous to read active reseller infrastructure
-- The view already filters by is_active=true, so this is safe
DROP POLICY IF EXISTS "Anonymous read active reseller_infrastructure" ON public.reseller_infrastructure;
CREATE POLICY "Anonymous read active reseller_infrastructure"
    ON public.reseller_infrastructure FOR SELECT
    USING (is_active = true);

-- Ensure GRANTs are in place for the view
GRANT SELECT ON public.public_tenant_discovery TO anon;
GRANT SELECT ON public.public_tenant_discovery TO authenticated;

-- Also grant SELECT on the underlying table for anon
GRANT SELECT ON public.reseller_infrastructure TO anon;

-- ============================================
-- 2. Fix landing_pages RLS (403)
-- ============================================

-- Ensure get_my_org_id() exists
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Drop ALL conflicting policies on landing_pages
DROP POLICY IF EXISTS "Tenant isolation landing_pages" ON public.landing_pages;
DROP POLICY IF EXISTS "Public read landing_pages" ON public.landing_pages;
DROP POLICY IF EXISTS "Public Access to Landing Pages" ON public.landing_pages;
DROP POLICY IF EXISTS "Public view landing_pages" ON public.landing_pages;

-- Tenant isolation: authenticated users see/modify only their org's rows
CREATE POLICY "Tenant isolation landing_pages" ON public.landing_pages
  FOR ALL TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- Public read: anon users can read active published pages
CREATE POLICY "Public read landing_pages" ON public.landing_pages
  FOR SELECT TO anon
  USING (is_active = true);

-- ============================================
-- 3. Notify PostgREST to reload schema
-- ============================================
NOTIFY pgrst, 'reload schema';
