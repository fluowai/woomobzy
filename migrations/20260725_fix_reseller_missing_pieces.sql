-- ============================================
-- FIX: Reseller infrastructure missing pieces
-- Addresses: 406 on public_tenant_discovery,
--            404 on get_tenant_public RPC,
--            500 on /api/mega/direct-clients
-- ============================================

-- 1. Ensure is_reseller and parent_id columns exist on organizations
--    (these may have been added via sql/setup_whitelabel_b2b2b.sql but not via migrations/)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_reseller BOOLEAN DEFAULT false;
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.organizations(id);

-- 2. Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON public.organizations(parent_id);
CREATE INDEX IF NOT EXISTS idx_organizations_is_reseller ON public.organizations(is_reseller);

-- 3. Create the missing get_tenant_public RPC function
--    Called by DomainRouter.tsx and PublicLandingPage.tsx
CREATE OR REPLACE FUNCTION public.get_tenant_public(slug_input TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    custom_domain TEXT,
    subdomain TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    niche TEXT,
    logo_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.name,
        o.slug,
        o.custom_domain,
        o.subdomain,
        o.primary_color,
        o.secondary_color,
        o.niche,
        o.logo_url
    FROM public.organizations o
    WHERE o.slug = slug_input
       OR o.subdomain = slug_input
       OR o.custom_domain = slug_input
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant execute to anon and authenticated so the RPC is callable from the client
GRANT EXECUTE ON FUNCTION public.get_tenant_public(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_public(TEXT) TO authenticated;

-- 5. Ensure the public_tenant_discovery view exists (re-create for safety)
CREATE OR REPLACE VIEW public.public_tenant_discovery AS
SELECT
    domain,
    supabase_url,
    supabase_anon_key
FROM
    public.reseller_infrastructure
WHERE
    is_active = true;

-- 6. Grant SELECT on the view to anon and authenticated
GRANT SELECT ON public.public_tenant_discovery TO anon;
GRANT SELECT ON public.public_tenant_discovery TO authenticated;
