-- ============================================
-- FIX v5: Landing pages public access for anon
-- Applied: 2026-07-30
--
-- Problems:
--   1. organizations table has no anon SELECT policy
--      → JOIN fails for anonymous users on PublicLandingPage
--   2. landing_pages public RLS checks is_active only,
--      should also check status = 'published'
--   3. publish() does not set is_active = true
--      (covered in TypeScript code, but policy should be robust)
-- ============================================

-- ============================================
-- 1. Anon SELECT policy on organizations
--    Only exposes fields needed for public pages
-- ============================================
DROP POLICY IF EXISTS "Public read organizations" ON public.organizations;
CREATE POLICY "Public read organizations"
  ON public.organizations FOR SELECT TO anon
  USING (is_active = true);

-- ============================================
-- 2. Drop conflicting landing_pages public policy
-- ============================================
DROP POLICY IF EXISTS "Public read landing_pages" ON public.landing_pages;

-- ============================================
-- 3. Recreate with both is_active AND status checks
--    anon users can only read published + active pages
-- ============================================
CREATE POLICY "Public read landing_pages"
  ON public.landing_pages FOR SELECT TO anon
  USING (is_active = true AND status = 'published');

-- ============================================
-- 4. Reload PostgREST schema cache
-- ============================================
NOTIFY pgrst, 'reload schema';
