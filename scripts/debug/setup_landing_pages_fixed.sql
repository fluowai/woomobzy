-- ============================================
-- IMOBZY - LANDING PAGES SETUP (CORRIGIDO)
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
WHERE NOT EXISTS (
  SELECT 1 FROM landing_pages lp
  WHERE lp.organization_id = o.id AND lp.slug = 'home'
);

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
INSERT INTO plans (name, price_monthly, features, limits, is_active)
SELECT name, price_monthly, features, limits, is_active
FROM (
  VALUES
    ('Starter'::text, 0, jsonb_build_object('maxUsers', 1, 'maxProperties', 15, 'landingPage', true, 'crm', 'basic', 'support', 'email'), jsonb_build_object('users', 1, 'properties', 15), true),
    ('Professional'::text, 97, jsonb_build_object('maxUsers', 5, 'maxProperties', 100, 'landingPage', true, 'crm', 'full', 'whatsapp', true, 'editor', true, 'support', 'priority'), jsonb_build_object('users', 5, 'properties', 100), true),
    ('Enterprise'::text, 197, jsonb_build_object('maxUsers', -1, 'maxProperties', -1, 'landingPage', true, 'crm', 'full', 'whatsapp', true, 'editor', true, 'ai', true, 'gis', true, 'customDomain', true, 'support', 'dedicated'), jsonb_build_object('users', -1, 'properties', -1), true)
) AS data(name, price_monthly, features, limits, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM plans p WHERE p.name = data.name
);

-- 5. INSERT DEFAULT SAAS SETTINGS
INSERT INTO saas_settings (id, global_evolution_url, global_evolution_api_key, default_plan_id)
SELECT 1, '', '', (SELECT id FROM plans WHERE name = 'Professional' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM saas_settings WHERE id = 1
);
