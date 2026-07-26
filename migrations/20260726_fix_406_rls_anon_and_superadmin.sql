-- ============================================
-- FIX: 406 Not Acceptable on public_tenant_discovery and saas_settings
--
-- Root cause:
--   1. public_tenant_discovery is a VIEW over reseller_infrastructure
--      which has RLS policies requiring auth.uid().
--      Anonymous users (before login / at bootstrap) get blocked → 406.
--   2. saas_settings has RLS enabled but no policy allowing superadmin
--      read access → 406 for authenticated superadmins too.
-- ============================================

-- 1. Allow anonymous + authenticated to read ACTIVE reseller infrastructure
--    (the view public_tenant_discovery filters by is_active=true, so this is safe)
DROP POLICY IF EXISTS "Anonymous read active reseller_infrastructure" ON public.reseller_infrastructure;
CREATE POLICY "Anonymous read active reseller_infrastructure"
    ON public.reseller_infrastructure FOR SELECT
    USING (is_active = true);

-- 2. Ensure saas_settings has RLS with superadmin access
ALTER TABLE public.saas_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin manage saas_settings" ON public.saas_settings;
CREATE POLICY "Superadmin manage saas_settings"
    ON public.saas_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'superadmin'
        )
    );

-- 3. Ensure GRANTs are in place for the view
GRANT SELECT ON public.public_tenant_discovery TO anon;
GRANT SELECT ON public.public_tenant_discovery TO authenticated;
