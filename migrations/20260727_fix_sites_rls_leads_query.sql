-- ============================================
-- FIX v3: 403 on sites INSERT
-- Applied: 2026-07-27
--
-- Root cause: get_my_org_id() was overwritten with a simpler
-- version that doesn't match the canonical COALESCE(JWT, profiles)
-- pattern. Also, policy uses inline EXISTS instead of public.is_superadmin().
-- And accented policy names from setup_site_builder.sql were never dropped.
-- ============================================

-- =============================================
-- 1. Restore canonical get_my_org_id() with JWT + profiles fallback
-- =============================================
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'organization_id', '')::uuid,
    (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
      LIMIT 1
    )
  );
$$;

-- =============================================
-- 2. Ensure is_superadmin() exists
-- =============================================
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'superadmin'
  );
$$;

-- =============================================
-- 3. Fix sites RLS — drop ALL policy name variants
-- =============================================

-- Drop every possible policy name variant on sites
DROP POLICY IF EXISTS "Usuarios veem apenas seu proprio site" ON public.sites;
DROP POLICY IF EXISTS "Usuários veem apenas seu próprio site" ON public.sites;
DROP POLICY IF EXISTS "Tenant isolation sites" ON public.sites;

-- Drop every possible policy name variant on site_pages
DROP POLICY IF EXISTS "Usuarios veem apenas paginas do seu site" ON public.sites;
DROP POLICY IF EXISTS "Usuários veem apenas páginas do seu site" ON public.site_pages;
DROP POLICY IF EXISTS "Tenant isolation site_pages" ON public.site_pages;

-- Sites: canonical pattern (get_my_org_id + is_superadmin)
CREATE POLICY "Tenant isolation sites"
  ON public.sites FOR ALL
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

-- Site pages: canonical pattern
CREATE POLICY "Tenant isolation site_pages"
  ON public.site_pages FOR ALL
  USING (
    site_id IN (SELECT id FROM public.sites WHERE organization_id = public.get_my_org_id())
    OR public.is_superadmin()
  )
  WITH CHECK (
    site_id IN (SELECT id FROM public.sites WHERE organization_id = public.get_my_org_id())
    OR public.is_superadmin()
  );

-- =============================================
-- 4. Fix public_tenant_discovery (406 refresh)
-- =============================================

CREATE OR REPLACE VIEW public.public_tenant_discovery AS
SELECT domain, supabase_url, supabase_anon_key
FROM public.reseller_infrastructure
WHERE is_active = true;

DROP POLICY IF EXISTS "Anonymous read active reseller_infrastructure" ON public.reseller_infrastructure;
CREATE POLICY "Anonymous read active reseller_infrastructure"
    ON public.reseller_infrastructure FOR SELECT
    USING (is_active = true);

GRANT SELECT ON public.public_tenant_discovery TO anon;
GRANT SELECT ON public.public_tenant_discovery TO authenticated;
GRANT SELECT ON public.reseller_infrastructure TO anon;
GRANT SELECT ON public.reseller_infrastructure TO authenticated;

-- =============================================
-- 5. Ensure leads.match_profile column exists
-- =============================================
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS match_profile TEXT;

-- =============================================
-- 6. Reload PostgREST schema cache
-- =============================================
NOTIFY pgrst, 'reload schema';
