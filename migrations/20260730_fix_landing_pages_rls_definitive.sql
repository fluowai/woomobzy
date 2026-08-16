-- ============================================
-- FIX v4: landing_pages RLS — definitive
-- Applied: 2026-07-30
--
-- Error: 403/42501 on landing_pages INSERT
-- Root cause:
--   - AI generation flow was not sending organization_id
--   - RLS policy did not include is_superadmin() bypass
--   - get_my_org_id() was overwritten by later migrations
--     without re-applying landing_pages policy
-- ============================================

-- ============================================
-- 1. Ensure canonical get_my_org_id() exists
-- ============================================
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

-- ============================================
-- 2. Ensure is_superadmin() exists
-- ============================================
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

-- ============================================
-- 3. Drop ALL conflicting policies on landing_pages
-- ============================================
DROP POLICY IF EXISTS "Tenant isolation landing_pages" ON public.landing_pages;
DROP POLICY IF EXISTS "Public read landing_pages" ON public.landing_pages;
DROP POLICY IF EXISTS "Public Access to Landing Pages" ON public.landing_pages;
DROP POLICY IF EXISTS "Public view landing_pages" ON public.landing_pages;

-- ============================================
-- 4. Tenant isolation: authenticated users + superadmin bypass
-- ============================================
CREATE POLICY "Tenant isolation landing_pages"
  ON public.landing_pages FOR ALL TO authenticated
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

-- ============================================
-- 5. Public read: anon users can view active published pages
-- ============================================
CREATE POLICY "Public read landing_pages"
  ON public.landing_pages FOR SELECT TO anon
  USING (is_active = true);

-- ============================================
-- 6. Reload PostgREST schema cache
-- ============================================
NOTIFY pgrst, 'reload schema';
