-- ========================================================================================
-- IMOBZY - COMPLETE DATABASE SCHEMA
-- Multi-tenant Real Estate SaaS Platform (Rural & Urban)
-- Version: 2.0.0
-- ========================================================================================

-- ========================================================================================
-- PARTE 1: EXTENSÕES E CONFIGURAÇÕES INICIAIS
-- ========================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS postgis; -- Descomente se usar PostGIS

-- ========================================================================================
-- PARTE 2: TABELAS PRINCIPAIS
-- ========================================================================================

-- ------------------------------------------------------------------------------
-- 2.1 ORGANIZATIONS (Tenants)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    subdomain TEXT UNIQUE,
    custom_domain TEXT UNIQUE,
    domain_verified BOOLEAN DEFAULT false,
    logo_url TEXT,
    logo_height INTEGER DEFAULT 40,
    primary_color TEXT DEFAULT '#064e3b',
    secondary_color TEXT DEFAULT '#d4af37',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'pending')),
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
    niche TEXT DEFAULT 'traditional' CHECK (niche IN ('rural', 'traditional', 'hybrid')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2.2 PROFILES (Users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'broker' CHECK (role IN ('superadmin', 'admin', 'broker', 'user')),
    avatar_url TEXT,
    phone TEXT,
    creci TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2.3 CUSTOM DOMAINS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    is_custom BOOLEAN DEFAULT false,
    is_primary BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'active', 'failed')),
    verified_at TIMESTAMP WITH TIME ZONE,
    dns_records JSONB DEFAULT '[]'::jsonb,
    ssl_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================================================
-- PARTE 3: PROPRIEDADES E IMÓVEIS
-- ========================================================================================

-- ------------------------------------------------------------------------------
-- 3.1 PROPERTIES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Informações Comerciais
    title TEXT NOT NULL,
    description TEXT,
    description_draft TEXT,
    price NUMERIC(20,2),
    currency TEXT DEFAULT 'BRL',
    status TEXT DEFAULT 'Disponível' CHECK (status IN ('Disponível', 'Alugado', 'Vendido', 'Reservado', 'Pendente', 'Inativo')),
    purpose TEXT DEFAULT 'Venda' CHECK (purpose IN ('Venda', 'Aluguel', 'Venda e Aluguel')),
    property_type TEXT DEFAULT 'Fazenda',
    
    -- Áreas Rurais (Hectares)
    total_area_ha NUMERIC(15,2) DEFAULT 0,
    useful_area_ha NUMERIC(15,2) DEFAULT 0,
    open_area_ha NUMERIC(15,2) DEFAULT 0,
    agricultural_area_ha NUMERIC(15,2) DEFAULT 0,
    pasture_area_ha NUMERIC(15,2) DEFAULT 0,
    reserve_legal_ha NUMERIC(15,2) DEFAULT 0,
    app_ha NUMERIC(15,2) DEFAULT 0,
    
    -- Localização
    city TEXT,
    neighborhood TEXT,
    state TEXT,
    region TEXT,
    address TEXT,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    
    -- Campos Técnicos Rurais
    aptitude TEXT[],    -- ['Agricultura', 'Pecuária', 'Mista']
    biome TEXT,         -- AMAZÔNIA, CERRADO, CAATINGA, PANTANAL
    topography TEXT,     -- PLANA, ONDULADA, MONTANHOSA
    soil_texture TEXT,  -- ARGILOSO, ARENOSO, MISTO
    altitude NUMERIC(10,2),
    pluviometry NUMERIC(10,2),
    
    -- Features Estendidas (JSONB)
    features JSONB DEFAULT '{}'::jsonb,
    
    -- Mídia
    images TEXT[] DEFAULT '{}',
    video_url TEXT,
    
    -- Metadados
    highlighted BOOLEAN DEFAULT false,
    is_confidential BOOLEAN DEFAULT false,
    is_exclusive BOOLEAN DEFAULT false,
    owner_info JSONB DEFAULT '{}'::jsonb,
    analysis JSONB DEFAULT '{}'::jsonb,
    layout_config JSONB DEFAULT '{}'::jsonb,
    
    -- Search
    search_vector TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3.2 PROPERTY POLYGONS (GIS - Shapefiles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS property_polygons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    geom_data TEXT, -- GeoJSON string (sem PostGIS) ou WKT
    source TEXT, -- MANUAL, CAR, SIGEF, KML
    area_calculated_ha NUMERIC(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================================================
-- PARTE 4: CRM E LEADS
-- ========================================================================================

-- ------------------------------------------------------------------------------
-- 4.1 LEADS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    status TEXT DEFAULT 'Novo' CHECK (status IN ('Novo', 'Em Atendimento', 'Proposta', 'Fechado', 'Perdido')),
    source TEXT DEFAULT 'Fale Conosco',
    notes TEXT,
    
    -- Interesse Rural
    budget NUMERIC(20,2),
    aptitude_interest TEXT[],
    preferences JSONB DEFAULT '{}'::jsonb,
    
    -- Tracking UTM
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    referrer_url TEXT,
    landing_page_url TEXT,
    client_id TEXT,
    fbp TEXT,
    fbc TEXT,
    session_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4.2 CRM LEADS (Kanban)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Novo' CHECK (status IN ('Novo', 'Qualificado', 'Proposta', 'Negociação', 'Fechado', 'Perdido')),
    pipeline TEXT DEFAULT 'default',
    stage_order INTEGER DEFAULT 0,
    value NUMERIC(20,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================================================
-- PARTE 5: CONFIGURAÇÕES DO SITE
-- ========================================================================================

-- ------------------------------------------------------------------------------
-- 5.1 SITE SETTINGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    template_id TEXT DEFAULT 'modern',
    
    -- Branding
    agency_name TEXT,
    primary_color TEXT DEFAULT '#064e3b',
    secondary_color TEXT DEFAULT '#d4af37',
    header_color TEXT,
    logo_url TEXT,
    logo_height INTEGER DEFAULT 40,
    font_family TEXT DEFAULT 'Inter, sans-serif',
    
    -- Contato
    contact_email TEXT,
    contact_phone TEXT,
    contact_whatsapp TEXT,
    footer_text TEXT,
    
    -- Social
    social_links JSONB DEFAULT '{
        "instagram": "",
        "facebook": "",
        "whatsapp": ""
    }'::jsonb,
    
    -- Home Content
    home_content JSONB DEFAULT '{}'::jsonb,
    
    -- Layout Editor
    layout_config JSONB DEFAULT '{}'::jsonb,
    integrations JSONB DEFAULT '{}'::jsonb,
    custom_css TEXT,
    custom_js TEXT,
    
    -- SEO
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5.2 SITE TEXTS (Editáveis)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_texts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT,
    section TEXT,
    default_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, key)
);

-- ------------------------------------------------------------------------------
-- 5.3 LANDING PAGES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS landing_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    content JSONB DEFAULT '[]'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    seo_title TEXT,
    seo_description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, slug)
);

-- ========================================================================================
-- PARTE 6: WHATSAPP BAILEYS
-- ========================================================================================

-- ------------------------------------------------------------------------------
-- 6.1 WHATSAPP INSTANCES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_number TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connecting', 'connected', 'disconnected', 'reconnecting')),
    qr_code TEXT,
    session_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, name)
);

-- ------------------------------------------------------------------------------
-- 6.2 WHATSAPP CHATS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
    jid TEXT NOT NULL,
    name TEXT,
    profile_photo_url TEXT,
    last_message_at TIMESTAMPTZ,
    unread_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(instance_id, jid)
);

-- ------------------------------------------------------------------------------
-- 6.3 WHATSAPP MESSAGES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES whatsapp_chats(id) ON DELETE CASCADE,
    key_id TEXT,
    message_type TEXT,
    content TEXT,
    media_url TEXT,
    from_me BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'received', 'failed')),
    timestamp TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================================================
-- PARTE 7: CONTRATOS
-- ========================================================================================

CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    title TEXT NOT NULL,
    contract_type TEXT CHECK (contract_type IN ('compra_venda', 'aluguel', 'parceria', 'arrendamento', 'outro')),
    content TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'archived')),
    
    parties JSONB DEFAULT '[]'::jsonb,
    terms JSONB DEFAULT '{}'::jsonb,
    
    created_by UUID REFERENCES profiles(id),
    signed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================================================
-- PARTE 8: SAAS (PLANS E SETTINGS)
-- ========================================================================================

-- ------------------------------------------------------------------------------
-- 8.1 PLANS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    price_monthly NUMERIC(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'BRL',
    features JSONB DEFAULT '{}'::jsonb,
    limits JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 8.2 SAAS SETTINGS (Globais)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saas_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    global_openai_key TEXT,
    global_gemini_key TEXT,
    maintenance_mode BOOLEAN DEFAULT false,
    default_plan_id UUID REFERENCES plans(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================================================
-- PARTE 9: SUPORTE E AUDITORIA
-- ========================================================================================

-- ------------------------------------------------------------------------------
-- 9.1 IMPERSONATION SESSIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impersonation_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES organizations(id),
    actor_user_id UUID NOT NULL REFERENCES auth.users(id),
    impersonated_user_id UUID NOT NULL REFERENCES auth.users(id),
    token_hash TEXT,
    reason TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 9.2 AUDIT LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES auth.users(id),
    target_resource TEXT,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    tenant_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================================================
-- PARTE 10: ÍNDICES
-- ========================================================================================

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_properties_org ON properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);

CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_org ON whatsapp_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_instance ON whatsapp_chats(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat ON whatsapp_messages(chat_id);

CREATE INDEX IF NOT EXISTS idx_impersonation_active ON impersonation_sessions(actor_user_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ========================================================================================
-- PARTE 11: ROW LEVEL SECURITY (RLS)
-- ========================================================================================

-- 11.1 Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are visible" ON profiles;
CREATE POLICY "Public profiles are visible" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 11.2 Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Organizations public view" ON organizations;
CREATE POLICY "Organizations public view" ON organizations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can update organization" ON organizations;
CREATE POLICY "Admins can update organization" ON organizations FOR UPDATE 
USING (id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- 11.3 Tenant Isolation Function
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11.4 Properties RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation properties" ON properties;
CREATE POLICY "Tenant isolation properties" ON properties FOR ALL
USING (organization_id = get_user_org_id() OR get_user_org_id() IS NULL);
DROP POLICY IF EXISTS "Public view properties" ON properties;
CREATE POLICY "Public view properties" ON properties FOR SELECT TO anon USING (status = 'Disponível');

-- 11.5 Leads RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation leads" ON leads;
CREATE POLICY "Tenant isolation leads" ON leads FOR ALL
USING (organization_id = get_user_org_id() OR get_user_org_id() IS NULL);
DROP POLICY IF EXISTS "Public insert leads" ON leads;
CREATE POLICY "Public insert leads" ON leads FOR INSERT TO anon WITH CHECK (true);

-- 11.6 CRM Leads RLS
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation crm_leads" ON crm_leads;
CREATE POLICY "Tenant isolation crm_leads" ON crm_leads FOR ALL
USING (organization_id = get_user_org_id() OR get_user_org_id() IS NULL);

-- 11.7 Site Settings RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation site_settings" ON site_settings;
CREATE POLICY "Tenant isolation site_settings" ON site_settings FOR ALL
USING (organization_id = get_user_org_id() OR get_user_org_id() IS NULL);
DROP POLICY IF EXISTS "Public view site_settings" ON site_settings;
CREATE POLICY "Public view site_settings" ON site_settings FOR SELECT TO anon USING (true);

-- 11.8 Site Texts RLS
ALTER TABLE site_texts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation site_texts" ON site_texts;
CREATE POLICY "Tenant isolation site_texts" ON site_texts FOR ALL
USING (organization_id = get_user_org_id() OR get_user_org_id() IS NULL);
DROP POLICY IF EXISTS "Public view site_texts" ON site_texts;
CREATE POLICY "Public view site_texts" ON site_texts FOR SELECT TO anon USING (true);

-- 11.9 Landing Pages RLS
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation landing_pages" ON landing_pages;
CREATE POLICY "Tenant isolation landing_pages" ON landing_pages FOR ALL
USING (organization_id = get_user_org_id() OR get_user_org_id() IS NULL);
DROP POLICY IF EXISTS "Public view landing_pages" ON landing_pages;
CREATE POLICY "Public view landing_pages" ON landing_pages FOR SELECT TO anon USING (is_active = true);

-- 11.10 WhatsApp Instances RLS
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation whatsapp_instances" ON whatsapp_instances;
CREATE POLICY "Tenant isolation whatsapp_instances" ON whatsapp_instances FOR ALL
USING (organization_id = get_user_org_id() OR get_user_org_id() IS NULL);

-- 11.11 WhatsApp Chats RLS
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation whatsapp_chats" ON whatsapp_chats;
CREATE POLICY "Tenant isolation whatsapp_chats" ON whatsapp_chats FOR ALL
USING (instance_id IN (SELECT id FROM whatsapp_instances WHERE organization_id = get_user_org_id()));

-- 11.12 WhatsApp Messages RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation whatsapp_messages" ON whatsapp_messages;
CREATE POLICY "Tenant isolation whatsapp_messages" ON whatsapp_messages FOR ALL
USING (chat_id IN (SELECT id FROM whatsapp_chats WHERE instance_id IN (SELECT id FROM whatsapp_instances WHERE organization_id = get_user_org_id())));

-- 11.13 Contracts RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation contracts" ON contracts;
CREATE POLICY "Tenant isolation contracts" ON contracts FOR ALL
USING (organization_id = get_user_org_id() OR get_user_org_id() IS NULL);

-- 11.14 Domains RLS
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation domains" ON domains;
CREATE POLICY "Tenant isolation domains" ON domains FOR ALL
USING (organization_id = get_user_org_id() OR get_user_org_id() IS NULL);

-- 11.15 Property Polygons RLS
ALTER TABLE property_polygons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation property_polygons" ON property_polygons;
CREATE POLICY "Tenant isolation property_polygons" ON property_polygons FOR ALL
USING (organization_id = get_user_org_id() OR get_user_org_id() IS NULL);

-- 11.16 Plans RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view plans" ON plans;
CREATE POLICY "Public view plans" ON plans FOR SELECT USING (is_active = true OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');
DROP POLICY IF EXISTS "Superadmin manage plans" ON plans;
CREATE POLICY "Superadmin manage plans" ON plans FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

-- 11.17 SaaS Settings RLS
ALTER TABLE saas_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Superadmin manage saas_settings" ON saas_settings;
CREATE POLICY "Superadmin manage saas_settings" ON saas_settings FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

-- 11.18 Impersonation Sessions RLS
ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Superadmin manage impersonation" ON impersonation_sessions;
CREATE POLICY "Superadmin manage impersonation" ON impersonation_sessions FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

-- 11.19 Audit Logs RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Superadmin view audit_logs" ON audit_logs;
CREATE POLICY "Superadmin view audit_logs" ON audit_logs FOR SELECT
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

-- ========================================================================================
-- PARTE 12: FUNÇÕES E TRIGGERS
-- ========================================================================================

-- 12.1 Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM profiles) INTO is_first;
  
  INSERT INTO public.profiles (id, email, role, name)
  VALUES (
    new.id, 
    new.email, 
    CASE WHEN is_first THEN 'superadmin' ELSE 'broker' END,
    COALESCE(new.raw_user_meta_data->>'name', new.email)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 12.2 Auto-create initial settings on org creation
CREATE OR REPLACE FUNCTION create_initial_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO site_settings (organization_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_org_settings ON organizations;
CREATE TRIGGER trigger_org_settings
AFTER INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION create_initial_settings();

-- 12.3 Set organization slug
CREATE OR REPLACE FUNCTION set_organization_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '', 'g'));
  END IF;
  NEW.subdomain := NEW.slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_org_slug ON organizations;
CREATE TRIGGER trigger_org_slug
BEFORE INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION set_organization_slug();

-- 12.4 Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE OR REPLACE TRIGGER update_organizations_timestamp
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER update_properties_timestamp
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER update_leads_timestamp
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER update_site_settings_timestamp
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================================================================
-- PARTE 13: RPC FUNCTIONS
-- ========================================================================================

-- 13.1 Exec SQL (for migrations)
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
  RETURN json_build_object('success', true, 'message', 'SQL executed successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 13.2 Get tenant by domain
CREATE OR REPLACE FUNCTION get_tenant_by_domain(domain_to_check TEXT)
RETURNS TABLE(id UUID, name TEXT, slug TEXT, primary_color TEXT, secondary_color TEXT, niche TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.name, o.slug, o.primary_color, o.secondary_color, o.niche
  FROM organizations o
  WHERE o.subdomain = domain_to_check 
     OR o.custom_domain = domain_to_check 
     OR o.slug = domain_to_check
     OR o.custom_domain = '%.' || domain_to_check
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13.3 Search properties
CREATE OR REPLACE FUNCTION search_properties(
  query_text TEXT DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  property_state TEXT DEFAULT NULL,
  property_type TEXT DEFAULT NULL,
  min_area NUMERIC DEFAULT NULL,
  max_area NUMERIC DEFAULT NULL
)
RETURNS SETOF properties AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM properties
  WHERE 
    (status = 'Disponível' OR status IS NULL)
    AND (
      query_text IS NULL OR 
      title ILIKE '%' || query_text || '%' OR 
      description ILIKE '%' || query_text || '%' OR
      city ILIKE '%' || query_text || '%'
    )
    AND (price >= min_price OR min_price IS NULL)
    AND (price <= max_price OR max_price IS NULL)
    AND (state = property_state OR property_state IS NULL)
    AND (property_type = property_type OR property_type IS NULL)
    AND (total_area_ha >= min_area OR min_area IS NULL)
    AND (total_area_ha <= max_area OR max_area IS NULL)
  ORDER BY highlighted DESC, created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 13.4 Is superadmin helper
CREATE OR REPLACE FUNCTION is_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13.5 Log audit action
CREATE OR REPLACE FUNCTION log_audit_action(
  p_action TEXT,
  p_target_resource TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_actor_id UUID;
  v_tenant_id UUID;
  v_audit_id UUID;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;
  
  BEGIN
    v_tenant_id := get_user_org_id();
  EXCEPTION WHEN OTHERS THEN
    v_tenant_id := NULL;
  END;
  
  INSERT INTO audit_logs (actor_id, target_resource, action, details, tenant_id)
  VALUES (v_actor_id, p_target_resource, p_action, p_details, v_tenant_id)
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================================
-- PARTE 14: SEED DATA (Dados Iniciais)
-- ========================================================================================

-- 14.1 Default Plans
INSERT INTO plans (name, price_monthly, features, limits, is_active) VALUES
('Starter', 0, '{"maxUsers": 1, "maxProperties": 15, "landingPage": true, "crm": "basic", "support": "email"}'::jsonb, '{"users": 1, "properties": 15}'::jsonb, true),
('Professional', 97, '{"maxUsers": 5, "maxProperties": 100, "landingPage": true, "crm": "full", "whatsapp": true, "editor": true, "support": "priority"}'::jsonb, '{"users": 5, "properties": 100}'::jsonb, true),
('Enterprise', 197, '{"maxUsers": -1, "maxProperties": -1, "landingPage": true, "crm": "full", "whatsapp": true, "editor": true, "ai": true, "gis": true, "customDomain": true, "support": "dedicated"}'::jsonb, '{"users": -1, "properties": -1}'::jsonb, true),
('Unlimited', 497, '{"maxUsers": -1, "maxProperties": -1, "landingPage": true, "crm": "full", "whatsapp": true, "editor": true, "ai": true, "gis": true, "customDomain": true, "api": true, "support": "dedicated"}'::jsonb, '{"users": -1, "properties": -1}'::jsonb, true)
ON CONFLICT (name) DO NOTHING;

-- 14.2 SaaS Settings
INSERT INTO saas_settings (id, maintenance_mode, default_plan_id)
SELECT 1, false, (SELECT id FROM plans WHERE name = 'Professional' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM saas_settings WHERE id = 1);

-- ========================================================================================
-- PARTE 15: LIMPEZA DE TABELAS ANTIGAS (Evolution API)
-- ========================================================================================

-- Remover tabelas antigas da Evolution API se existirem
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS instances CASCADE;

-- Remover colunas antigas de evolution das tabelas existentes
ALTER TABLE saas_settings DROP COLUMN IF EXISTS global_evolution_url;
ALTER TABLE saas_settings DROP COLUMN IF EXISTS global_evolution_api_key;

-- ========================================================================================
-- FIM DO SCHEMA
-- Execute este script no Supabase SQL Editor para criar/atualizar o banco de dados
-- ========================================================================================
