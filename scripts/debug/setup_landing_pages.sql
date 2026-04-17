-- ============================================
-- IMOBZY - LANDING PAGES SETUP
-- ============================================

-- 1. INSERT DEFAULT LANDING PAGE BLOCKS
INSERT INTO landing_pages (organization_id, slug, title, content, settings, is_active)
SELECT
  o.id,
  'home',
  'Página Inicial',
  jsonb_build_array(
    jsonb_build_object(
      'id', 'hero',
      'type', 'hero',
      'content', jsonb_build_object(
        'title', 'Bem-vindo à ' || o.name,
        'subtitle', 'Encontre o imóvel ideal para você',
        'backgroundImage', '',
        'ctaText', 'Ver Imóveis',
        'ctaLink', '#properties'
      )
    ),
    jsonb_build_object(
      'id', 'properties',
      'type', 'properties-grid',
      'content', jsonb_build_object(
        'title', 'Nossos Imóveis',
        'subtitle', 'Descubra oportunidades únicas',
        'limit', 12
      )
    ),
    jsonb_build_object(
      'id', 'contact',
      'type', 'contact-form',
      'content', jsonb_build_object(
        'title', 'Entre em Contato',
        'subtitle', 'Estamos aqui para ajudar',
        'fields', jsonb_build_array('name', 'email', 'phone', 'message')
      )
    )
  ),
  jsonb_build_object(
    'seo', jsonb_build_object(
      'title', 'Página Inicial',
      'description', 'Bem-vindo à nossa imobiliária',
      'keywords', jsonb_build_array('imóveis', 'comprar', 'alugar')
    ),
    'theme', jsonb_build_object(
      'primaryColor', '#3b82f6',
      'secondaryColor', '#1f2937'
    )
  ),
  true
FROM organizations o
-- 2. INSERT DEFAULT SITE TEXTS
INSERT INTO site_texts (organization_id, key, value)
SELECT org_id, key_val, val
FROM (
  VALUES
    ((SELECT id FROM organizations LIMIT 1), 'hero_title', 'Bem-vindo à Nossa Imobiliária'),
    ((SELECT id FROM organizations LIMIT 1), 'hero_subtitle', 'Encontre o imóvel dos seus sonhos'),
    ((SELECT id FROM organizations LIMIT 1), 'about_title', 'Sobre Nós'),
    ((SELECT id FROM organizations LIMIT 1), 'about_content', 'Somos especialistas em imóveis rurais e urbanos, oferecendo os melhores serviços do mercado.'),
    ((SELECT id FROM organizations LIMIT 1), 'contact_title', 'Entre em Contato'),
    ((SELECT id FROM organizations LIMIT 1), 'contact_subtitle', 'Estamos aqui para ajudar você a encontrar o imóvel ideal'),
    ((SELECT id FROM organizations LIMIT 1), 'footer_text', '© 2024 Todos os direitos reservados')
) AS data(org_id, key_val, val)
WHERE NOT EXISTS (
  SELECT 1 FROM site_texts st
  WHERE st.organization_id = data.org_id AND st.key = data.key_val
);

-- 3. INSERT DEFAULT SITE SETTINGS
INSERT INTO site_settings (organization_id, theme, contact, integrations, seo)
SELECT
  o.id,
  jsonb_build_object(
    'primaryColor', '#3b82f6',
    'secondaryColor', '#1f2937',
    'fontFamily', 'Inter',
    'logo', ''
  ),
  jsonb_build_object(
    'phone', '',
    'email', '',
    'address', '',
    'whatsapp', ''
  ),
  jsonb_build_object(
    'evolutionApi', jsonb_build_object(
      'enabled', false,
      'baseUrl', '',
      'token', ''
    )
  ),
  jsonb_build_object(
    'title', 'IMOBZY - Sistema Imobiliário',
    'description', 'Plataforma completa para gestão imobiliária',
    'keywords', jsonb_build_array('imóveis', 'imobiliária', 'comprar', 'alugar'),
    'ogImage', ''
  )
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM site_settings ss
  WHERE ss.organization_id = o.id
);
-- 4. INSERT DEFAULT PLANS
INSERT INTO plans (name, price_monthly, features, limits, is_active) VALUES
  ('Starter', 0,
   jsonb_build_object('maxUsers', 1, 'maxProperties', 15, 'landingPage', true, 'crm', 'basic', 'support', 'email'),
   jsonb_build_object('users', 1, 'properties', 15),
   true),
  ('Professional', 97,
   jsonb_build_object('maxUsers', 5, 'maxProperties', 100, 'landingPage', true, 'crm', 'full', 'whatsapp', true, 'editor', true, 'support', 'priority'),
   jsonb_build_object('users', 5, 'properties', 100),
   true),
  ('Enterprise', 197,
   jsonb_build_object('maxUsers', -1, 'maxProperties', -1, 'landingPage', true, 'crm', 'full', 'whatsapp', true, 'editor', true, 'ai', true, 'gis', true, 'customDomain', true, 'support', 'dedicated'),
   jsonb_build_object('users', -1, 'properties', -1),
   true)
WHERE NOT EXISTS (
  SELECT 1 FROM plans p WHERE p.name = plans.name
);

-- 5. INSERT DEFAULT SAAS SETTINGS
INSERT INTO saas_settings (id, global_evolution_url, global_evolution_api_key, default_plan_id) VALUES
  (1, '', '', (SELECT id FROM plans WHERE name = 'Professional' LIMIT 1))
WHERE NOT EXISTS (
  SELECT 1 FROM saas_settings WHERE id = 1
);

-- 6. CREATE DEFAULT ORGANIZATION IF NONE EXISTS
INSERT INTO organizations (id, name, slug, status)
SELECT '550e8400-e29b-41d4-a716-446655440000', 'IMOBZY Demo', 'imobzy-demo', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM organizations WHERE slug = 'imobzy-demo'
);
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
