-- ============================================
-- FIX v2: 403 on sites INSERT (impersonation)
-- Applied: 2026-07-27
--
-- Error 1: 403 Forbidden on sites INSERT/SELECT
--   Cause: RLS uses get_my_org_id() but during superadmin
--          impersonation auth.uid() returns superadmin's user,
--          not the impersonated tenant. get_my_org_id() resolves
--          to the superadmin's own org, not the target org.
--   Fix: Add superadmin bypass to sites and site_pages policies
--
-- Error 2: 406 Not Acceptable on public_tenant_discovery
--   Fix: Refresh view, policies and grants
-- ============================================

-- =============================================
-- 1. Ensure get_my_org_id() helper exists
-- =============================================
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- =============================================
-- 2. Fix sites RLS with superadmin bypass
-- =============================================

DROP POLICY IF EXISTS "Tenant isolation sites" ON public.sites;
DROP POLICY IF EXISTS "Usuarios veem apenas seu proprio site" ON public.sites;
DROP POLICY IF EXISTS "Tenant isolation site_pages" ON public.site_pages;
DROP POLICY IF EXISTS "Usuarios veem apenas paginas do seu site" ON public.site_pages;

-- Sites: tenant match OR superadmin bypass
CREATE POLICY "Tenant isolation sites"
  ON public.sites FOR ALL
  USING (
    organization_id = get_my_org_id()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  )
  WITH CHECK (
    organization_id = get_my_org_id()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Site pages: tenant match through sites OR superadmin bypass
CREATE POLICY "Tenant isolation site_pages"
  ON public.site_pages FOR ALL
  USING (
    site_id IN (
      SELECT id FROM public.sites
      WHERE organization_id = get_my_org_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  )
  WITH CHECK (
    site_id IN (
      SELECT id FROM public.sites
      WHERE organization_id = get_my_org_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- =============================================
-- 3. Fix public_tenant_discovery (406 refresh)
-- =============================================

CREATE OR REPLACE VIEW public.public_tenant_discovery AS
SELECT
    domain,
    supabase_url,
    supabase_anon_key
FROM
    public.reseller_infrastructure
WHERE
    is_active = true;

DROP POLICY IF EXISTS "Anonymous read active reseller_infrastructure" ON public.reseller_infrastructure;
CREATE POLICY "Anonymous read active reseller_infrastructure"
    ON public.reseller_infrastructure FOR SELECT
    USING (is_active = true);

GRANT SELECT ON public.public_tenant_discovery TO anon;
GRANT SELECT ON public.public_tenant_discovery TO authenticated;
GRANT SELECT ON public.reseller_infrastructure TO anon;
GRANT SELECT ON public.reseller_infrastructure TO authenticated;

-- =============================================
-- 4. Ensure leads.match_profile column exists
-- =============================================
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS match_profile TEXT;

-- =============================================
-- 5. Reload PostgREST schema cache
-- =============================================
NOTIFY pgrst, 'reload schema';
