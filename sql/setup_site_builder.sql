-- ============================================
-- SITE BUILDER - Estrutura de Dados
-- Cada organização (cliente) tem um site
-- com múltiplas páginas editáveis
-- ============================================

-- 1. SITES (um por organização)
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
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

-- 2. SITE PAGES (páginas do site)
CREATE TABLE IF NOT EXISTS site_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
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

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_sites_org ON sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_site_pages_site ON site_pages(site_id);
CREATE INDEX IF NOT EXISTS idx_site_pages_slug ON site_pages(site_id, slug);
CREATE INDEX IF NOT EXISTS idx_site_pages_published ON site_pages(site_id, status);

-- 4. Função para criar site automaticamente ao criar organização
CREATE OR REPLACE FUNCTION auto_create_site()
RETURNS trigger AS $$
BEGIN
  INSERT INTO sites (organization_id, name)
  VALUES (NEW.id, CONCAT('Site - ', NEW.name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_site ON organizations;
CREATE TRIGGER trg_auto_create_site
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_site();

-- 5. Função para criar página home padrão ao criar site
CREATE OR REPLACE FUNCTION auto_create_home_page()
RETURNS trigger AS $$
BEGIN
  INSERT INTO site_pages (site_id, title, slug, sort_order, status, is_home)
  VALUES (NEW.id, 'Início', 'home', 0, 'published', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_home_page ON sites;
CREATE TRIGGER trg_auto_create_home_page
  AFTER INSERT ON sites
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_home_page();

-- 6. RLS Policies
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem apenas seu próprio site"
  ON sites FOR ALL
  USING (organization_id = auth.uid()::text::uuid);

CREATE POLICY "Usuários veem apenas páginas do seu site"
  ON site_pages FOR ALL
  USING (
    site_id IN (
      SELECT id FROM sites WHERE organization_id = auth.uid()::text::uuid
    )
  );

NOTIFY pgrst, 'reload schema';
