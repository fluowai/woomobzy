-- ============================================
-- LANDING PAGE BUILDER - DATABASE SCHEMA
-- ============================================
-- Criado em: 2026-01-14
-- Descrição: Schema completo para sistema de landing pages editáveis
-- ============================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: landing_pages
-- ============================================
CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identificação
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT[],
  og_image TEXT,
  
  -- Configuração Visual
  template_id VARCHAR(50) DEFAULT 'modern',
  theme_config JSONB DEFAULT '{
    "primaryColor": "#2563eb",
    "secondaryColor": "#10b981",
    "accentColor": "#f59e0b",
    "backgroundColor": "#ffffff",
    "textColor": "#111827",
    "fontFamily": "Inter",
    "headingFontFamily": "Poppins",
    "fontSize": {
      "base": "16px",
      "heading1": "48px",
      "heading2": "36px",
      "heading3": "24px"
    },
    "borderRadius": "8px",
    "spacing": {
      "xs": "4px",
      "sm": "8px",
      "md": "16px",
      "lg": "24px",
      "xl": "32px"
    }
  }'::jsonb,
  
  -- Layout (Blocos do Editor Visual)
  blocks JSONB DEFAULT '[]'::jsonb,
  
  -- Configurações Gerais
  settings JSONB DEFAULT '{
    "headerStyle": "transparent",
    "footerStyle": "minimal",
    "showBranding": true
  }'::jsonb,
  
  -- Imóveis Vinculados
  property_selection JSONB DEFAULT '{
    "mode": "manual",
    "propertyIds": [],
    "filters": {},
    "sortBy": "price",
    "sortOrder": "desc",
    "limit": 12
  }'::jsonb,
  
  -- Formulário de Contato
  form_config JSONB DEFAULT '{
    "enabled": true,
    "fields": ["name", "email", "phone", "message"],
    "submitText": "Enviar Mensagem",
    "successMessage": "Mensagem enviada com sucesso! Entraremos em contato em breve.",
    "whatsappEnabled": true,
    "emailEnabled": true,
    "recipientEmail": "",
    "whatsappNumber": ""
  }'::jsonb,
  
  -- Status e Analytics
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP,
  views_count INTEGER DEFAULT 0,
  leads_count INTEGER DEFAULT 0,
  
  -- Custom Code
  custom_css TEXT,
  custom_js TEXT,
  custom_head TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELA: landing_page_blocks
-- ============================================
-- Blocos salvos para reutilização
CREATE TABLE IF NOT EXISTS landing_page_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  thumbnail TEXT,
  
  is_template BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELA: landing_page_analytics
-- ============================================
CREATE TABLE IF NOT EXISTS landing_page_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,
  
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  
  -- Dados do Visitante
  visitor_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer TEXT,
  
  -- Geolocalização (opcional)
  country VARCHAR(2),
  city VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_org ON landing_pages(organization_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_user ON landing_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON landing_pages(status);
CREATE INDEX IF NOT EXISTS idx_landing_pages_published ON landing_pages(published_at) WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_landing_page_blocks_org ON landing_page_blocks(organization_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_blocks_type ON landing_page_blocks(type);

CREATE INDEX IF NOT EXISTS idx_landing_page_analytics_page ON landing_page_analytics(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_analytics_event ON landing_page_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_landing_page_analytics_date ON landing_page_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_landing_page_analytics_visitor ON landing_page_analytics(visitor_id);

-- ============================================
-- TRIGGER: updated_at automático
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_landing_pages_updated_at BEFORE UPDATE ON landing_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_landing_page_blocks_updated_at BEFORE UPDATE ON landing_page_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_analytics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS DE ACESSO - landing_pages
-- ============================================

-- Usuários podem visualizar landing pages da sua organização
CREATE POLICY "Users can view their org landing pages"
  ON landing_pages FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Usuários podem criar landing pages
CREATE POLICY "Users can create landing pages"
  ON landing_pages FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Usuários podem atualizar landing pages da sua organização
CREATE POLICY "Users can update their org landing pages"
  ON landing_pages FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Usuários podem deletar landing pages da sua organização
CREATE POLICY "Users can delete their org landing pages"
  ON landing_pages FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Público pode visualizar landing pages publicadas
CREATE POLICY "Public can view published landing pages"
  ON landing_pages FOR SELECT
  USING (status = 'published');

-- ============================================
-- POLÍTICAS DE ACESSO - landing_page_blocks
-- ============================================

CREATE POLICY "Users can view their org blocks"
  ON landing_page_blocks FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR is_template = true
  );

CREATE POLICY "Users can create blocks"
  ON landing_page_blocks FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org blocks"
  ON landing_page_blocks FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org blocks"
  ON landing_page_blocks FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- POLÍTICAS DE ACESSO - landing_page_analytics
-- ============================================

-- Usuários podem visualizar analytics das suas landing pages
CREATE POLICY "Users can view their landing page analytics"
  ON landing_page_analytics FOR SELECT
  USING (
    landing_page_id IN (
      SELECT id FROM landing_pages 
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Público pode inserir eventos de analytics (tracking)
CREATE POLICY "Public can insert analytics events"
  ON landing_page_analytics FOR INSERT
  WITH CHECK (true);

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para gerar slug único
CREATE OR REPLACE FUNCTION generate_unique_slug(base_slug TEXT, org_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  new_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM landing_pages WHERE slug = new_slug AND organization_id = org_id) LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- Função para incrementar contador de views
CREATE OR REPLACE FUNCTION increment_landing_page_views(page_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE landing_pages 
  SET views_count = views_count + 1 
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql;

-- Função para incrementar contador de leads
CREATE OR REPLACE FUNCTION increment_landing_page_leads(page_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE landing_pages 
  SET leads_count = leads_count + 1 
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DADOS INICIAIS (TEMPLATES)
-- ============================================

-- Template: Imóvel Único
INSERT INTO landing_page_blocks (id, organization_id, name, type, config, is_template)
VALUES (
  uuid_generate_v4(),
  NULL,
  'Hero - Imóvel Destaque',
  'hero',
  '{
    "title": "Seu Imóvel dos Sonhos",
    "subtitle": "Conheça esta propriedade exclusiva",
    "backgroundImage": "",
    "overlayOpacity": 0.5,
    "ctaText": "Agendar Visita",
    "ctaLink": "#contato",
    "height": 600,
    "alignment": "center",
    "textColor": "#ffffff"
  }'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- Template: Grid de Imóveis
INSERT INTO landing_page_blocks (id, organization_id, name, type, config, is_template)
VALUES (
  uuid_generate_v4(),
  NULL,
  'Grid de Imóveis - 3 Colunas',
  'property_grid',
  '{
    "columns": 3,
    "gap": 24,
    "showFilters": true,
    "maxItems": 12,
    "sortBy": "price",
    "cardStyle": "modern"
  }'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- Template: Formulário de Contato
INSERT INTO landing_page_blocks (id, organization_id, name, type, config, is_template)
VALUES (
  uuid_generate_v4(),
  NULL,
  'Formulário de Contato Completo',
  'form',
  '{
    "title": "Entre em Contato",
    "fields": [
      {"name": "name", "type": "text", "label": "Nome Completo", "required": true, "placeholder": "Seu nome"},
      {"name": "email", "type": "email", "label": "E-mail", "required": true, "placeholder": "seu@email.com"},
      {"name": "phone", "type": "tel", "label": "Telefone", "required": true, "placeholder": "(00) 00000-0000"},
      {"name": "message", "type": "textarea", "label": "Mensagem", "required": false, "placeholder": "Como podemos ajudar?"}
    ],
    "submitText": "Enviar Mensagem",
    "successMessage": "Mensagem enviada! Entraremos em contato em breve."
  }'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- ============================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE landing_pages IS 'Landing pages criadas pelos usuários com editor visual';
COMMENT ON TABLE landing_page_blocks IS 'Blocos salvos e templates reutilizáveis';
COMMENT ON TABLE landing_page_analytics IS 'Eventos e analytics das landing pages';

COMMENT ON COLUMN landing_pages.slug IS 'URL amigável única para a landing page';
COMMENT ON COLUMN landing_pages.blocks IS 'Array de blocos do editor visual com configurações';
COMMENT ON COLUMN landing_pages.property_selection IS 'Configuração de seleção de imóveis (manual ou filtros)';
COMMENT ON COLUMN landing_pages.theme_config IS 'Configurações de tema (cores, fontes, espaçamentos)';
COMMENT ON COLUMN landing_pages.status IS 'Status: draft, published, archived';

-- ============================================
-- FIM DO SCRIPT
-- ============================================
