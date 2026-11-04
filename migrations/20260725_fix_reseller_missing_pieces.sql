-- ============================================
-- FIX: Missing database objects for BYOB tenant
-- Addresses all 4 console errors:
--   406 public_tenant_discovery
--   400 leads (match_profile)
--   403 /api/locacao/leases
--   404 sites table
-- ============================================

-- =============================================
-- A. Reseller infrastructure
-- =============================================

-- A1. Ensure is_reseller and parent_id columns exist on organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_reseller BOOLEAN DEFAULT false;
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.organizations(id);

-- A2. Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON public.organizations(parent_id);
CREATE INDEX IF NOT EXISTS idx_organizations_is_reseller ON public.organizations(is_reseller);

-- A3. Create the missing get_tenant_public RPC function
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

GRANT EXECUTE ON FUNCTION public.get_tenant_public(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_public(TEXT) TO authenticated;

-- A4. Ensure the public_tenant_discovery view exists
CREATE OR REPLACE VIEW public.public_tenant_discovery AS
SELECT
    domain,
    supabase_url,
    supabase_anon_key
FROM
    public.reseller_infrastructure
WHERE
    is_active = true;

GRANT SELECT ON public.public_tenant_discovery TO anon;
GRANT SELECT ON public.public_tenant_discovery TO authenticated;

-- =============================================
-- B. Sites + Site Pages (from sql/setup_site_builder.sql)
-- =============================================

-- B1. SITES table
CREATE TABLE IF NOT EXISTS public.sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Meu Site',
  is_active BOOLEAN DEFAULT true,
  logo_url TEXT,
  favicon_url TEXT,
  global_theme JSONB DEFAULT '{}'::jsonb,
  global_header JSONB DEFAULT '[]'::jsonb,
  global_footer JSONB DEFAULT '[]'::jsonb,
  menu_config JSONB DEFAULT '[]'::jsonb,
  contact_info JSONB DEFAULT '{}'::jsonb,
  social_links JSONB DEFAULT '{}'::jsonb,
  custom_css TEXT,
  custom_js TEXT,
  custom_head TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- B2. SITE_PAGES table
CREATE TABLE IF NOT EXISTS public.site_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  blocks JSONB DEFAULT '[]'::jsonb,
  theme_overrides JSONB DEFAULT '{}'::jsonb,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[] DEFAULT '{}',
  og_image TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  is_home BOOLEAN DEFAULT false,
  custom_css TEXT,
  custom_js TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, slug)
);

-- B3. Indexes
CREATE INDEX IF NOT EXISTS idx_sites_org ON public.sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_site_pages_site ON public.site_pages(site_id);
CREATE INDEX IF NOT EXISTS idx_site_pages_slug ON public.site_pages(site_id, slug);
CREATE INDEX IF NOT EXISTS idx_site_pages_published ON public.site_pages(site_id, status);

-- B4. Auto-create site trigger
CREATE OR REPLACE FUNCTION public.auto_create_site()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.sites (organization_id, name)
  VALUES (NEW.id, CONCAT('Site - ', NEW.name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_site ON public.organizations;
CREATE TRIGGER trg_auto_create_site
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_site();

-- B5. Auto-create home page trigger
CREATE OR REPLACE FUNCTION public.auto_create_home_page()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.site_pages (site_id, title, slug, sort_order, status, is_home)
  VALUES (NEW.id, 'Inicio', 'home', 0, 'published', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_home_page ON public.sites;
CREATE TRIGGER trg_auto_create_home_page
  AFTER INSERT ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_home_page();

-- B6. RLS
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist, then recreate
DROP POLICY IF EXISTS "Usuarios veem apenas seu proprio site" ON public.sites;
CREATE POLICY "Usuarios veem apenas seu proprio site"
  ON public.sites FOR ALL
  USING (organization_id = auth.uid()::text::uuid);

DROP POLICY IF EXISTS "Usuarios veem apenas paginas do seu site" ON public.site_pages;
CREATE POLICY "Usuarios veem apenas paginas do seu site"
  ON public.site_pages FOR ALL
  USING (
    site_id IN (
      SELECT id FROM public.sites WHERE organization_id = auth.uid()::text::uuid
    )
  );

-- =============================================
-- C. Ensure match_profile column exists on leads
-- =============================================
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS match_profile TEXT;

-- =============================================
-- D. Notify PostgREST to reload schema
-- =============================================
NOTIFY pgrst, 'reload schema';
