-- ============================================
-- FIX: 403 on sites INSERT + 400 on leads query
-- Applied: 2026-07-27
--
-- Error 1: 403 Forbidden on sites INSERT/SELECT
--   Cause: RLS policy "Usuarios veem apenas seu proprio site"
--          uses organization_id = auth.uid()::text::uuid
--          which compares org_id to user_auth_id (WRONG)
--   Fix: Use get_my_org_id() to look up the user's organization
--
-- Error 2: 400 Bad Request on leads query with match_profile
--   Cause: match_profile column may not exist if prior migration
--          20260725_fix_reseller_missing_pieces.sql wasn't applied
--   Fix: Ensure column exists + fix the OR filter syntax
--
-- Error 3: 406 Not Acceptable on public_tenant_discovery
--   Cause: View may need GRANTs or RLS policy refresh
--   Fix: Re-apply grants and policies
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
-- 2. Fix sites RLS (403 Forbidden on INSERT)
-- =============================================

-- Drop the broken policies
DROP POLICY IF EXISTS "Usuarios veem apenas seu proprio site" ON public.sites;
DROP POLICY IF EXISTS "Usuarios veem apenas paginas do seu site" ON public.site_pages;

-- Sites: tenant isolation using get_my_org_id()
CREATE POLICY "Tenant isolation sites"
  ON public.sites FOR ALL
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- Site pages: tenant isolation through sites
CREATE POLICY "Tenant isolation site_pages"
  ON public.site_pages FOR ALL
  USING (
    site_id IN (
      SELECT id FROM public.sites WHERE organization_id = get_my_org_id()
    )
  )
  WITH CHECK (
    site_id IN (
      SELECT id FROM public.sites WHERE organization_id = get_my_org_id()
    )
  );

-- =============================================
-- 3. Ensure leads.match_profile column exists (400 fix)
-- =============================================
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS match_profile TEXT;

-- =============================================
-- 4. Fix public_tenant_discovery (406 fix refresh)
-- =============================================

-- Recreate view
CREATE OR REPLACE VIEW public.public_tenant_discovery AS
SELECT
    domain,
    supabase_url,
    supabase_anon_key
FROM
    public.reseller_infrastructure
WHERE
    is_active = true;

-- Drop and recreate the anon read policy
DROP POLICY IF EXISTS "Anonymous read active reseller_infrastructure" ON public.reseller_infrastructure;
CREATE POLICY "Anonymous read active reseller_infrastructure"
    ON public.reseller_infrastructure FOR SELECT
    USING (is_active = true);

-- Ensure GRANTs
GRANT SELECT ON public.public_tenant_discovery TO anon;
GRANT SELECT ON public.public_tenant_discovery TO authenticated;
GRANT SELECT ON public.reseller_infrastructure TO anon;
GRANT SELECT ON public.reseller_infrastructure TO authenticated;

-- =============================================
-- 5. Ensure site_pages RLS is enabled
-- =============================================
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. Notify PostgREST to reload schema
-- =============================================
NOTIFY pgrst, 'reload schema';
