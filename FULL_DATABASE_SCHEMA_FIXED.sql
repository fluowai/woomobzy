-- ==========================================
-- BASE SCHEMA (COMPLETE_SCHEMA.sql)
-- ==========================================
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
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

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

-- ==========================================
-- MIGRATIONS FOLDER
-- ==========================================

-- ------------------------------------------
-- 007_bi_rpc_functions.sql
-- ------------------------------------------
-- BI Stats RPC
CREATE OR REPLACE FUNCTION get_bi_stats(org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_value', COALESCE(SUM(price), 0),
        'property_count', COUNT(*),
        'total_area_ha', COALESCE(SUM((features->>'areaHectares')::numeric), 0),
        'avg_ha_price', CASE 
            WHEN COALESCE(SUM((features->>'areaHectares')::numeric), 0) > 0 
            THEN COALESCE(SUM(price), 0) / SUM((features->>'areaHectares')::numeric) 
            ELSE 0 
        END
    ) INTO result
    FROM properties
    WHERE organization_id = org_id;
    
    RETURN result;
END;
$$;

-- BI Lead Sources RPC
CREATE OR REPLACE FUNCTION get_bi_lead_sources(org_id UUID)
RETURNS TABLE (name TEXT, value BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(source, 'Outros') as name,
        COUNT(*) as value
    FROM leads
    WHERE organization_id = org_id
    GROUP BY source
    ORDER BY value DESC;
END;
$$;

-- ------------------------------------------
-- 016_add_call_tables.sql
-- ------------------------------------------
-- Call History: stores every call made or received
CREATE TABLE IF NOT EXISTS call_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id     UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
    tenant_id       UUID REFERENCES organizations(id) ON DELETE SET NULL,
    call_id         TEXT NOT NULL,
    peer_jid        TEXT NOT NULL DEFAULT '',
    peer_phone      TEXT NOT NULL DEFAULT '',
    peer_name       TEXT NOT NULL DEFAULT '',
    direction       TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status          TEXT NOT NULL CHECK (status IN ('pending', 'ringing', 'connected', 'ended', 'failed')),
    end_reason      TEXT NOT NULL DEFAULT '' CHECK (end_reason IN ('', 'user_ended', 'declined', 'no_answer', 'busy', 'failed', 'cancelled', 'timeout', 'unknown')),
    duration_secs   INTEGER NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ,
    connected_at    TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_history_instance_id ON call_history(instance_id);
CREATE INDEX IF NOT EXISTS idx_call_history_tenant_id ON call_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_history_call_id ON call_history(call_id);
CREATE INDEX IF NOT EXISTS idx_call_history_status ON call_history(status);
CREATE INDEX IF NOT EXISTS idx_call_history_created_at ON call_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_history_peer_phone ON call_history(peer_phone);

-- Call Recordings: stores metadata for recorded calls
CREATE TABLE IF NOT EXISTS call_recordings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id         UUID NOT NULL REFERENCES call_history(id) ON DELETE CASCADE,
    instance_id     UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
    tenant_id       UUID REFERENCES organizations(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('none', 'pending', 'ready', 'failed')),
    provider        TEXT NOT NULL DEFAULT 'minio',
    bucket          TEXT NOT NULL DEFAULT '',
    object_key      TEXT NOT NULL DEFAULT '',
    public_url      TEXT NOT NULL DEFAULT '',
    filename        TEXT NOT NULL DEFAULT '',
    mime_type       TEXT NOT NULL DEFAULT '',
    duration_secs   INTEGER NOT NULL DEFAULT 0,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    last_error      TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_recordings_call_id ON call_recordings(call_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_instance_id ON call_recordings(instance_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_tenant_id ON call_recordings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_status ON call_recordings(status);

-- Enable auto-update for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_call_history_updated_at') THEN
        CREATE TRIGGER update_call_history_updated_at
            BEFORE UPDATE ON call_history
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_call_recordings_updated_at') THEN
        CREATE TRIGGER update_call_recordings_updated_at
            BEFORE UPDATE ON call_recordings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;

-- ------------------------------------------
-- 20260516_ai_agents_whatsapp_automation.sql
-- ------------------------------------------
-- AI agents and WhatsApp CRM automation support

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'whatsapp_instances_tenant_id_fkey'
      AND table_name = 'whatsapp_instances'
  ) THEN
    ALTER TABLE whatsapp_instances DROP CONSTRAINT whatsapp_instances_tenant_id_fkey;
  END IF;
END $$;

ALTER TABLE whatsapp_instances
  ADD CONSTRAINT whatsapp_instances_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Atendimento',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  is_active BOOLEAN NOT NULL DEFAULT true,
  personality TEXT,
  instructions TEXT,
  handoff_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  tools TEXT[] NOT NULL DEFAULT '{}',
  response_style TEXT NOT NULL DEFAULT 'consultivo',
  working_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_org ON ai_agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active ON ai_agents(organization_id, is_active);

CREATE TABLE IF NOT EXISTS lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_lead_tags_org ON lead_tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead ON lead_tags(lead_id);

CREATE TABLE IF NOT EXISTS lead_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_followups_org_due ON lead_followups(organization_id, due_at);
CREATE INDEX IF NOT EXISTS idx_lead_followups_lead ON lead_followups(lead_id);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS chat_jid TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget NUMERIC(20,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS matched_properties JSONB DEFAULT '[]'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS match_summary TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;

ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ai_agents" ON ai_agents
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on lead_tags" ON lead_tags
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on lead_followups" ON lead_followups
  FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------
-- 20260516_lead_property_matches.sql
-- ------------------------------------------
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS matched_properties JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS match_summary TEXT,
  ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS budget NUMERIC(20,2),
  ADD COLUMN IF NOT EXISTS aptitude_interest TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS classification TEXT,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_matched_at
  ON leads(matched_at);

-- ------------------------------------------
-- 20260517_conversation_memory_agent_brain.sql
-- ------------------------------------------
-- Conversation Memory + Neural Brain for AI Agents
-- Evita que agentes repitam perguntas e permite qualifica-los

CREATE TABLE IF NOT EXISTS conversation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_memory_session ON conversation_memory(organization_id, session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conv_memory_agent ON conversation_memory(organization_id, agent_id, created_at);

CREATE TABLE IF NOT EXISTS agent_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  session_id TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_qualifications_agent ON agent_qualifications(organization_id, agent_id);

CREATE TABLE IF NOT EXISTS agent_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  output_text TEXT NOT NULL,
  was_helpful BOOLEAN,
  corrected_output TEXT,
  tags TEXT[] DEFAULT '{}',
  learning_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_learning_agent ON agent_learning(organization_id, agent_id);

ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on conversation_memory" ON conversation_memory
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on agent_qualifications" ON agent_qualifications
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on agent_learning" ON agent_learning
  FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------
-- 20260520_site_settings_schema_alignment.sql
-- ------------------------------------------
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS agency_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#064e3b',
  ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#d4af37',
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS header_color TEXT,
  ADD COLUMN IF NOT EXISTS footer_text TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_whatsapp_template TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS tracking_pixels JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS integrations JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE public.site_settings
SET social_links = COALESCE(social_links, '{}'::jsonb)
  || jsonb_strip_nulls(
    jsonb_build_object(
      'facebook', facebook_url,
      'instagram', instagram_url,
      'whatsapp', whatsapp_url,
      'youtube', youtube_url,
      'linkedin', linkedin_url
    )
  );

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------
-- 20260524_subscription_plans.sql
-- ------------------------------------------
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS selected_plan_at TIMESTAMPTZ;

INSERT INTO public.plans (name, slug, price_monthly, features, limits, is_active, trial_days)
VALUES
  (
    'Free',
    'free',
    0,
    '["crm","site"]'::jsonb,
    '{"users":1,"properties":15,"whatsapp_instances":0}'::jsonb,
    true,
    7
  ),
  (
    'Essencial',
    'starter',
    97,
    '["crm","site","whatsapp"]'::jsonb,
    '{"users":5,"properties":100,"whatsapp_instances":1}'::jsonb,
    true,
    7
  ),
  (
    'Profissional',
    'pro',
    197,
    '["crm","site","whatsapp","ia_chat","api"]'::jsonb,
    '{"users":-1,"properties":-1,"whatsapp_instances":3}'::jsonb,
    true,
    7
  ),
  (
    'Enterprise',
    'enterprise',
    397,
    '["crm","site","whatsapp","ia_chat","api"]'::jsonb,
    '{"users":-1,"properties":-1,"whatsapp_instances":10}'::jsonb,
    true,
    7
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  is_active = EXCLUDED.is_active,
  trial_days = EXCLUDED.trial_days,
  updated_at = now();

UPDATE public.organizations
SET niche = 'traditional'
WHERE niche = 'hybrid';

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------
-- 20260526_fix_support_ticket_foreign_keys.sql
-- ------------------------------------------
-- Ensure Supabase/PostgREST can discover support ticket relationships.
-- CREATE TABLE IF NOT EXISTS does not add foreign keys to tables that already existed.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.support_tickets'::regclass
      AND conname = 'support_tickets_organization_id_fkey'
  ) THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_organization_id_fkey
      FOREIGN KEY (organization_id)
      REFERENCES public.organizations(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.support_tickets'::regclass
      AND conname = 'support_tickets_user_id_fkey'
  ) THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.support_messages'::regclass
      AND conname = 'support_messages_ticket_id_fkey'
  ) THEN
    ALTER TABLE public.support_messages
      ADD CONSTRAINT support_messages_ticket_id_fkey
      FOREIGN KEY (ticket_id)
      REFERENCES public.support_tickets(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.support_messages'::regclass
      AND conname = 'support_messages_user_id_fkey'
  ) THEN
    ALTER TABLE public.support_messages
      ADD CONSTRAINT support_messages_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOREACH constraint_name IN ARRAY ARRAY[
    'support_tickets_organization_id_fkey',
    'support_tickets_user_id_fkey',
    'support_messages_ticket_id_fkey',
    'support_messages_user_id_fkey'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I',
        CASE
          WHEN constraint_name LIKE 'support_tickets_%' THEN 'support_tickets'
          ELSE 'support_messages'
        END,
        constraint_name
      );
    EXCEPTION
      WHEN foreign_key_violation THEN
        RAISE NOTICE 'Constraint % contains existing orphaned rows and remains NOT VALID.', constraint_name;
    END;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------
-- 20260526_fix_whatsapp_tenant_fk.sql
-- ------------------------------------------
BEGIN;

ALTER TABLE whatsapp_instances
  DROP CONSTRAINT IF EXISTS whatsapp_instances_tenant_id_fkey;

-- Older WhatsApp rows stored auth user ids in tenant_id. The current API sends
-- organization ids, so migrate legacy rows before enforcing the correct FK.
UPDATE whatsapp_instances wi
SET tenant_id = p.organization_id
FROM profiles p
WHERE wi.tenant_id = p.id
  AND p.organization_id IS NOT NULL
  AND wi.tenant_id <> p.organization_id;

-- Keep rows that cannot be mapped to an organization, but make them valid for
-- the organization FK. They will stay hidden from tenant-scoped lists.
UPDATE whatsapp_instances wi
SET tenant_id = NULL
WHERE wi.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM organizations o
    WHERE o.id = wi.tenant_id
  );

ALTER TABLE whatsapp_instances
  ADD CONSTRAINT whatsapp_instances_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE;

COMMIT;

-- ------------------------------------------
-- 20260528_demo_scheduler.sql
-- ------------------------------------------
create extension if not exists pgcrypto;

create table if not exists public.demo_availability_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'booked', 'blocked')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint demo_slot_time_order check (ends_at > starts_at)
);

create unique index if not exists demo_availability_slots_starts_at_idx
  on public.demo_availability_slots (starts_at);

create table if not exists public.demo_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references public.demo_availability_slots(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  company text,
  team_size text,
  monthly_leads text,
  main_goal text,
  urgency text,
  score integer not null default 0,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demo_bookings_slot_id_idx on public.demo_bookings (slot_id);
create index if not exists demo_bookings_created_at_idx on public.demo_bookings (created_at desc);

-- ------------------------------------------
-- 20260530_fluowai_cloud_migration_control.sql
-- ------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.migration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'testing', 'ready', 'running', 'paused', 'completed', 'failed', 'cancelled', 'rolled_back')),
  source_supabase_url TEXT,
  target_supabase_url TEXT,
  target_minio_endpoint TEXT,
  selected_schemas TEXT[] NOT NULL DEFAULT ARRAY['public', 'auth'],
  selected_buckets TEXT[] NOT NULL DEFAULT ARRAY['whatsapp-media', 'imobzyimg', 'imobzymsg', 'documents', 'exports'],
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  dry_run_approved BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('source', 'target', 'minio')),
  encrypted_payload TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, scope)
);

CREATE TABLE IF NOT EXISTS public.migration_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'cancelled')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_logs (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  step TEXT,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_errors (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  step TEXT,
  entity_type TEXT,
  entity_name TEXT,
  error_message TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_file_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  old_url TEXT,
  new_url TEXT,
  bucket TEXT,
  path TEXT,
  size BIGINT,
  content_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_table_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  schema_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  source_count BIGINT,
  target_count BIGINT,
  migrated_count BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.migration_config_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('before_activation', 'after_activation')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS migration_jobs_status_idx ON public.migration_jobs(status);
CREATE UNIQUE INDEX IF NOT EXISTS migration_steps_job_step_idx ON public.migration_steps(job_id, step);
CREATE INDEX IF NOT EXISTS migration_logs_job_created_idx ON public.migration_logs(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS migration_errors_job_created_idx ON public.migration_errors(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS migration_file_map_job_status_idx ON public.migration_file_map(job_id, status);
CREATE INDEX IF NOT EXISTS migration_table_map_job_status_idx ON public.migration_table_map(job_id, status);

ALTER TABLE public.migration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_file_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_table_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_config_snapshots ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- 20260531_align_whatsapp_schema.sql
-- ------------------------------------------
BEGIN;

-- Align legacy Baileys WhatsApp tables with the current Go service contract.
-- Older databases may have organization_id/jid/profile_photo_url/key_id/from_me
-- while the service now reads tenant_id/chat_jid/avatar_url/message_id/is_from_me.

ALTER TABLE IF EXISTS public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS jid VARCHAR(100),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_instances'
      AND column_name = 'organization_id'
  ) THEN
    UPDATE public.whatsapp_instances
    SET tenant_id = organization_id
    WHERE tenant_id IS NULL
      AND organization_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_instances'
      AND column_name = 'phone_number'
  ) THEN
    UPDATE public.whatsapp_instances
    SET phone = phone_number
    WHERE (phone IS NULL OR phone = '')
      AND phone_number IS NOT NULL;
  END IF;
END $$;

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid
     AND att.attnum = ANY(con.conkey)
    WHERE con.conrelid = 'public.whatsapp_instances'::regclass
      AND con.contype = 'c'
      AND att.attname = 'status'
  LOOP
    EXECUTE format('ALTER TABLE public.whatsapp_instances DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

UPDATE public.whatsapp_instances
SET status = CASE status
  WHEN 'pending' THEN 'qr_pending'
  WHEN 'reconnecting' THEN 'connecting'
  ELSE status
END
WHERE status IN ('pending', 'reconnecting');

ALTER TABLE public.whatsapp_instances
  ALTER COLUMN status SET DEFAULT 'disconnected';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_instances'::regclass
      AND conname = 'whatsapp_instances_status_check'
  ) THEN
    ALTER TABLE public.whatsapp_instances
      ADD CONSTRAINT whatsapp_instances_status_check
      CHECK (status IN ('connected', 'disconnected', 'connecting', 'qr_pending'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_instances'
      AND constraint_name = 'whatsapp_instances_tenant_id_fkey'
  ) THEN
    ALTER TABLE public.whatsapp_instances DROP CONSTRAINT whatsapp_instances_tenant_id_fkey;
  END IF;

  ALTER TABLE public.whatsapp_instances
    ADD CONSTRAINT whatsapp_instances_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
END $$;

ALTER TABLE IF EXISTS public.whatsapp_chats
  ADD COLUMN IF NOT EXISTS chat_jid VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_message TEXT,
  ADD COLUMN IF NOT EXISTS unread_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_chats'
      AND column_name = 'jid'
  ) THEN
    UPDATE public.whatsapp_chats
    SET chat_jid = jid
    WHERE (chat_jid IS NULL OR chat_jid = '')
      AND jid IS NOT NULL;

    ALTER TABLE public.whatsapp_chats ALTER COLUMN jid DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_chats'
      AND column_name = 'profile_photo_url'
  ) THEN
    UPDATE public.whatsapp_chats
    SET avatar_url = profile_photo_url
    WHERE (avatar_url IS NULL OR avatar_url = '')
      AND profile_photo_url IS NOT NULL;
  END IF;
END $$;

UPDATE public.whatsapp_chats
SET chat_jid = id::text
WHERE chat_jid IS NULL OR chat_jid = '';

UPDATE public.whatsapp_chats
SET
  name = COALESCE(name, ''),
  unread_count = COALESCE(unread_count, 0),
  is_group = COALESCE(is_group, chat_jid LIKE '%@g.us', FALSE);

ALTER TABLE public.whatsapp_chats
  ALTER COLUMN chat_jid SET NOT NULL,
  ALTER COLUMN name SET DEFAULT '',
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN unread_count SET DEFAULT 0,
  ALTER COLUMN unread_count SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_chats'::regclass
      AND conname = 'whatsapp_chats_instance_chat_jid_key'
  ) THEN
    ALTER TABLE public.whatsapp_chats
      ADD CONSTRAINT whatsapp_chats_instance_chat_jid_key UNIQUE (instance_id, chat_jid);
  END IF;
END $$;

ALTER TABLE IF EXISTS public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS message_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_from_me BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_mimetype VARCHAR(100),
  ADD COLUMN IF NOT EXISTS media_filename VARCHAR(255),
  ADD COLUMN IF NOT EXISTS quoted_message_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_messages'
      AND column_name = 'key_id'
  ) THEN
    UPDATE public.whatsapp_messages
    SET message_id = key_id
    WHERE (message_id IS NULL OR message_id = '')
      AND key_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_messages'
      AND column_name = 'from_me'
  ) THEN
    UPDATE public.whatsapp_messages
    SET is_from_me = COALESCE(from_me, FALSE);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_messages'
      AND column_name = 'message_type'
  ) THEN
    UPDATE public.whatsapp_messages
    SET type = COALESCE(NULLIF(message_type, ''), 'text')
    WHERE type IS NULL OR type = '' OR type = 'text';
  END IF;
END $$;

UPDATE public.whatsapp_messages m
SET
  message_id = COALESCE(NULLIF(m.message_id, ''), m.id::text),
  sender_phone = COALESCE(NULLIF(m.sender_phone, ''), regexp_replace(split_part(c.chat_jid, '@', 1), '\D', '', 'g'), ''),
  sender_name = COALESCE(m.sender_name, ''),
  type = CASE
    WHEN COALESCE(m.type, '') IN ('text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contact', 'unknown')
    THEN m.type
    ELSE 'unknown'
  END,
  is_group = COALESCE(m.is_group, c.is_group, FALSE)
FROM public.whatsapp_chats c
WHERE c.id = m.chat_id;

UPDATE public.whatsapp_messages
SET
  message_id = COALESCE(NULLIF(message_id, ''), id::text),
  sender_phone = COALESCE(NULLIF(sender_phone, ''), ''),
  sender_name = COALESCE(sender_name, ''),
  type = CASE
    WHEN COALESCE(type, '') IN ('text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contact', 'unknown')
    THEN type
    ELSE 'unknown'
  END
WHERE message_id IS NULL
   OR message_id = ''
   OR sender_phone IS NULL
   OR type IS NULL
   OR type = '';

ALTER TABLE public.whatsapp_messages
  ALTER COLUMN message_id SET NOT NULL,
  ALTER COLUMN sender_phone SET DEFAULT '',
  ALTER COLUMN sender_phone SET NOT NULL,
  ALTER COLUMN sender_name SET DEFAULT '',
  ALTER COLUMN sender_name SET NOT NULL,
  ALTER COLUMN is_from_me SET DEFAULT FALSE,
  ALTER COLUMN is_from_me SET NOT NULL,
  ALTER COLUMN is_group SET DEFAULT FALSE,
  ALTER COLUMN is_group SET NOT NULL,
  ALTER COLUMN type SET DEFAULT 'text',
  ALTER COLUMN type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_messages'::regclass
      AND conname = 'whatsapp_messages_instance_message_id_key'
  ) THEN
    ALTER TABLE public.whatsapp_messages
      ADD CONSTRAINT whatsapp_messages_instance_message_id_key UNIQUE (instance_id, message_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  phone VARCHAR(20),
  push_name VARCHAR(255),
  display_name VARCHAR(255) NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS push_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_contacts'
      AND column_name = 'jid'
  ) THEN
    UPDATE public.whatsapp_contacts
    SET phone = regexp_replace(split_part(jid, '@', 1), '\D', '', 'g')
    WHERE (phone IS NULL OR phone = '')
      AND jid IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_contacts'
      AND column_name = 'profile_photo_url'
  ) THEN
    UPDATE public.whatsapp_contacts
    SET avatar_url = profile_photo_url
    WHERE (avatar_url IS NULL OR avatar_url = '')
      AND profile_photo_url IS NOT NULL;
  END IF;
END $$;

UPDATE public.whatsapp_contacts
SET
  phone = COALESCE(NULLIF(phone, ''), id::text),
  display_name = COALESCE(display_name, push_name, '');

ALTER TABLE public.whatsapp_contacts
  ALTER COLUMN display_name SET DEFAULT '',
  ALTER COLUMN display_name SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_contacts'::regclass
      AND conname = 'whatsapp_contacts_instance_phone_key'
  ) THEN
    ALTER TABLE public.whatsapp_contacts
      ADD CONSTRAINT whatsapp_contacts_instance_phone_key UNIQUE (instance_id, phone);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_tenant ON public.whatsapp_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_instance ON public.whatsapp_chats(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_jid ON public.whatsapp_chats(chat_jid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_last_msg ON public.whatsapp_chats(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat ON public.whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance ON public.whatsapp_messages(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_instance ON public.whatsapp_contacts(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON public.whatsapp_contacts(phone);

COMMIT;

-- ------------------------------------------
-- 20260531_hardening_tenant_storage_policies.sql
-- ------------------------------------------
-- IMOBZY hardening consolidado apos auditoria MinIO/tenant.
-- Corrige policies permissivas antigas e padroniza isolamento por organizacao.

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'organization_id', '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'superadmin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
ALTER FUNCTION public.is_superadmin() SET search_path = public;

-- Properties: usuarios autenticados so acessam o proprio tenant; anonimo so ve estoque publico.
ALTER TABLE IF EXISTS public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access to Properties" ON public.properties;
DROP POLICY IF EXISTS "Public read properties" ON public.properties;
DROP POLICY IF EXISTS "Tenant isolation properties" ON public.properties;
DROP POLICY IF EXISTS "Tenant isolation policy" ON public.properties;

CREATE POLICY "Tenant isolation properties" ON public.properties
  FOR ALL TO authenticated
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

CREATE POLICY "Public read available properties" ON public.properties
  FOR SELECT TO anon
  USING (status IN ('Disponivel', 'Disponível', 'available', 'publicado'));

-- Leads: nunca devem ser publicos; tenant ou superadmin.
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation leads" ON public.leads;
DROP POLICY IF EXISTS "Tenant isolation policy" ON public.leads;

CREATE POLICY "Tenant isolation leads" ON public.leads
  FOR ALL TO authenticated
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

-- WhatsApp: substituir policies FOR ALL USING(true) por relacao com tenant.
ALTER TABLE IF EXISTS public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Service role full access on contacts" ON public.whatsapp_contacts;
DROP POLICY IF EXISTS "Service role full access on chats" ON public.whatsapp_chats;
DROP POLICY IF EXISTS "Service role full access on messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Tenant isolation instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Tenant isolation contacts" ON public.whatsapp_contacts;
DROP POLICY IF EXISTS "Tenant isolation chats" ON public.whatsapp_chats;
DROP POLICY IF EXISTS "Tenant isolation messages" ON public.whatsapp_messages;

CREATE POLICY "Tenant isolation instances" ON public.whatsapp_instances
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_org_id() OR public.is_superadmin());

CREATE POLICY "Tenant isolation contacts" ON public.whatsapp_contacts
  FOR ALL TO authenticated
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_contacts.instance_id
        AND wi.tenant_id = public.get_my_org_id()
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_contacts.instance_id
        AND wi.tenant_id = public.get_my_org_id()
    )
  );

CREATE POLICY "Tenant isolation chats" ON public.whatsapp_chats
  FOR ALL TO authenticated
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_chats.instance_id
        AND wi.tenant_id = public.get_my_org_id()
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_chats.instance_id
        AND wi.tenant_id = public.get_my_org_id()
    )
  );

CREATE POLICY "Tenant isolation messages" ON public.whatsapp_messages
  FOR ALL TO authenticated
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_messages.instance_id
        AND wi.tenant_id = public.get_my_org_id()
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_messages.instance_id
        AND wi.tenant_id = public.get_my_org_id()
    )
  );

-- Agentes e automacoes de CRM/WhatsApp. Algumas bases antigas ainda nao tem
-- essas tabelas, entao a correcao e condicional.
DO $$
DECLARE
  policy_table text;
BEGIN
  FOREACH policy_table IN ARRAY ARRAY['ai_agents', 'lead_tags', 'lead_followups']
  LOOP
    IF to_regclass('public.' || policy_table) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', policy_table);
      EXECUTE format('DROP POLICY IF EXISTS "Service role full access on %s" ON public.%I', policy_table, policy_table);
      EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation %s" ON public.%I', policy_table, policy_table);
      EXECUTE format(
        'CREATE POLICY "Tenant isolation %s" ON public.%I FOR ALL TO authenticated USING (organization_id = public.get_my_org_id() OR public.is_superadmin()) WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin())',
        policy_table,
        policy_table
      );
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------
-- 20260603_whatsapp_media_pipeline.sql
-- ------------------------------------------
-- WhatsApp media pipeline foundation.
-- Keeps legacy whatsapp_messages.media_* fields for compatibility while adding
-- a first-class media entity for retries, processing metadata and AI output.

ALTER TABLE IF EXISTS public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS media_error TEXT,
  ADD COLUMN IF NOT EXISTS media_retry_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_messages'::regclass
      AND conname = 'whatsapp_messages_media_status_check'
  ) THEN
    ALTER TABLE public.whatsapp_messages
      ADD CONSTRAINT whatsapp_messages_media_status_check
      CHECK (media_status IN ('none', 'pending', 'downloading', 'processing', 'ready', 'failed', 'expired'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.whatsapp_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  type TEXT NOT NULL,

  provider TEXT NOT NULL DEFAULT 'minio',
  bucket TEXT NOT NULL DEFAULT 'whatsapp-media',
  object_key TEXT NOT NULL DEFAULT '',
  public_url TEXT,

  filename TEXT,
  mime_type TEXT,
  size_bytes BIGINT,

  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,

  thumbnail_url TEXT,
  thumbnail_bucket TEXT,
  thumbnail_object_key TEXT,

  waveform JSONB,
  transcription TEXT,
  summary TEXT,
  sentiment TEXT,
  extracted_tasks JSONB,
  ocr_text TEXT,
  ai_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT whatsapp_media_type_check
    CHECK (type IN ('image', 'audio', 'video', 'document', 'sticker', 'unknown')),
  CONSTRAINT whatsapp_media_status_check
    CHECK (status IN ('pending', 'downloading', 'processing', 'ready', 'failed', 'expired'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_media_message_unique
  ON public.whatsapp_media(message_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_media_instance_status
  ON public.whatsapp_media(instance_id, status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_media_tenant_type_created
  ON public.whatsapp_media(tenant_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_media_status_retry
  ON public.whatsapp_media(status, retry_count, updated_at);

CREATE OR REPLACE FUNCTION public.touch_whatsapp_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_whatsapp_media_updated_at ON public.whatsapp_media;
CREATE TRIGGER trg_touch_whatsapp_media_updated_at
  BEFORE UPDATE ON public.whatsapp_media
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_whatsapp_media_updated_at();

INSERT INTO public.whatsapp_media (
  message_id,
  instance_id,
  tenant_id,
  type,
  provider,
  bucket,
  object_key,
  public_url,
  filename,
  mime_type,
  status,
  created_at,
  updated_at
)
SELECT
  m.id,
  m.instance_id,
  wi.tenant_id,
  CASE
    WHEN m.type IN ('image', 'audio', 'video', 'document', 'sticker') THEN m.type
    ELSE 'unknown'
  END,
  CASE
    WHEN COALESCE(m.media_url, '') ILIKE '%supabase%' THEN 'supabase'
    ELSE 'minio'
  END,
  CASE
    WHEN COALESCE(m.media_url, '') ILIKE '%/storage/v1/object/public/%'
      THEN split_part(regexp_replace(m.media_url, '^.*/storage/v1/object/public/', ''), '/', 1)
    WHEN COALESCE(m.media_url, '') ~ '^https?://'
      THEN split_part(regexp_replace(m.media_url, '^https?://[^/]+/', ''), '/', 1)
    ELSE 'whatsapp-media'
  END,
  CASE
    WHEN COALESCE(m.media_url, '') ILIKE '%/storage/v1/object/public/%'
      THEN regexp_replace(m.media_url, '^.*/storage/v1/object/public/[^/]+/', '')
    WHEN COALESCE(m.media_url, '') ~ '^https?://'
      THEN regexp_replace(m.media_url, '^https?://[^/]+/[^/]+/?', '')
    ELSE ''
  END,
  NULLIF(m.media_url, ''),
  NULLIF(m.media_filename, ''),
  NULLIF(m.media_mimetype, ''),
  CASE WHEN COALESCE(m.media_url, '') <> '' THEN 'ready' ELSE 'pending' END,
  COALESCE(m.created_at, now()),
  now()
FROM public.whatsapp_messages m
JOIN public.whatsapp_instances wi ON wi.id = m.instance_id
WHERE m.type IN ('image', 'audio', 'video', 'document', 'sticker')
  AND NOT EXISTS (
    SELECT 1
    FROM public.whatsapp_media wm
    WHERE wm.message_id = m.id
  );

UPDATE public.whatsapp_messages m
SET media_status = CASE
    WHEN COALESCE(m.media_url, '') <> '' THEN 'ready'
    WHEN m.type IN ('image', 'audio', 'video', 'document', 'sticker') THEN 'pending'
    ELSE 'none'
  END
WHERE m.media_status = 'none'
  AND m.type IN ('image', 'audio', 'video', 'document', 'sticker');

ALTER TABLE public.whatsapp_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on whatsapp media" ON public.whatsapp_media;
CREATE POLICY "Service role full access on whatsapp media"
  ON public.whatsapp_media
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation whatsapp media" ON public.whatsapp_media;
CREATE POLICY "Tenant isolation whatsapp media"
  ON public.whatsapp_media
  FOR ALL
  USING (
    tenant_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- ------------------------------------------
-- 20260604_email_center.sql
-- ------------------------------------------
-- Professional email center for ImobFluow.
-- Multi-tenant, Supabase-compatible schema with encrypted external mailbox credentials.

create extension if not exists pgcrypto;

create table if not exists email_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null,
  email text not null,
  encrypted_password text not null,
  imap_host text not null,
  imap_port integer not null default 993,
  imap_secure boolean not null default true,
  smtp_host text not null,
  smtp_port integer not null default 465,
  smtp_secure boolean not null default true,
  auth_method text not null default 'password',
  oauth_provider text,
  oauth_account_id text,
  last_inbox_uid bigint not null default 0,
  last_synced_at timestamptz,
  sync_status text not null default 'idle',
  sync_error text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, email)
);

alter table email_accounts add column if not exists auth_method text not null default 'password';
alter table email_accounts add column if not exists oauth_provider text;
alter table email_accounts add column if not exists oauth_account_id text;
alter table email_accounts add column if not exists last_inbox_uid bigint not null default 0;
alter table email_accounts add column if not exists sync_status text not null default 'idle';
alter table email_accounts add column if not exists sync_error text;
alter table email_accounts add column if not exists updated_at timestamptz not null default now();

create table if not exists emails (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  account_id uuid not null references email_accounts(id) on delete cascade,
  folder text not null default 'inbox',
  direction text not null default 'incoming',
  subject text,
  from_name text,
  from_email text,
  to_email text[] not null default '{}',
  cc_email text[] not null default '{}',
  body_html text,
  body_text text,
  preview text,
  date timestamptz,
  is_read boolean not null default false,
  is_archived boolean not null default false,
  message_id text,
  in_reply_to text,
  references_ids text[] not null default '{}',
  thread_id text not null,
  imap_uid bigint,
  lead_id uuid references leads(id) on delete set null,
  raw_headers jsonb not null default '{}',
  ai_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table emails add column if not exists ai_metadata jsonb not null default '{}';
alter table emails add column if not exists updated_at timestamptz not null default now();

create table if not exists email_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid,
  account_id uuid references email_accounts(id) on delete cascade,
  email_id uuid references emails(id) on delete cascade,
  event_type text not null check (event_type in ('email_received', 'email_sent')),
  payload jsonb not null default '{}',
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists email_automation_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email_id uuid references emails(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  payload jsonb not null default '{}',
  result jsonb not null default '{}',
  run_after timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists email_accounts_org_user_email_idx
  on email_accounts (organization_id, user_id, lower(email));

create unique index if not exists emails_account_folder_uid_idx
  on emails (account_id, folder, imap_uid)
  where imap_uid is not null;

create unique index if not exists emails_account_message_folder_idx
  on emails (account_id, message_id, folder)
  where message_id is not null;

create index if not exists emails_org_folder_date_idx
  on emails (organization_id, folder, date desc);

create index if not exists emails_org_thread_idx
  on emails (organization_id, thread_id, date asc);

create index if not exists emails_org_lead_idx
  on emails (organization_id, lead_id)
  where lead_id is not null;

create index if not exists email_events_org_type_idx
  on email_events (organization_id, event_type, created_at desc);

alter table email_accounts enable row level security;
alter table emails enable row level security;
alter table email_events enable row level security;
alter table email_automation_jobs enable row level security;

drop policy if exists email_accounts_tenant_select on email_accounts;
create policy email_accounts_tenant_select on email_accounts
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.organization_id = email_accounts.organization_id
    )
  );

drop policy if exists emails_tenant_select on emails;
create policy emails_tenant_select on emails
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.organization_id = emails.organization_id
    )
  );

drop policy if exists email_events_tenant_select on email_events;
create policy email_events_tenant_select on email_events
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.organization_id = email_events.organization_id
    )
  );

drop policy if exists email_automation_jobs_tenant_select on email_automation_jobs;
create policy email_automation_jobs_tenant_select on email_automation_jobs
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.organization_id = email_automation_jobs.organization_id
    )
  );

-- ------------------------------------------
-- 20260604_storage_integrations.sql
-- ------------------------------------------
-- Storage provider integrations managed from the SuperAdmin panel.

CREATE TABLE IF NOT EXISTS public.storage_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT storage_integrations_provider_unique UNIQUE (provider)
);

CREATE INDEX IF NOT EXISTS idx_storage_integrations_provider
  ON public.storage_integrations(provider);

ALTER TABLE public.storage_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on storage integrations" ON public.storage_integrations;
CREATE POLICY "Service role full access on storage integrations"
  ON public.storage_integrations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------
-- 20260604_storage_intelligence.sql
-- ------------------------------------------
-- Storage Intelligence / MinIO Auditor
-- Inventory, deduplication metadata and protected admin action logs.

CREATE TABLE IF NOT EXISTS public.storage_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    bucket TEXT NOT NULL,
    object_key TEXT NOT NULL,
    sha256 TEXT,
    etag TEXT,
    size_bytes BIGINT,
    mime_type TEXT,
    source TEXT,
    entity_type TEXT,
    entity_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT storage_objects_bucket_key_unique UNIQUE (bucket, object_key)
);

CREATE INDEX IF NOT EXISTS idx_storage_objects_tenant_bucket
  ON public.storage_objects(tenant_id, bucket);

CREATE INDEX IF NOT EXISTS idx_storage_objects_sha256
  ON public.storage_objects(tenant_id, bucket, sha256)
  WHERE sha256 IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_storage_objects_size
  ON public.storage_objects(size_bytes DESC);

CREATE INDEX IF NOT EXISTS idx_storage_objects_expires
  ON public.storage_objects(expires_at)
  WHERE expires_at IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.storage_inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket TEXT NOT NULL,
    object_key TEXT NOT NULL,
    size_bytes BIGINT,
    etag TEXT,
    extension TEXT,
    prefix TEXT,
    tenant_id TEXT,
    is_version BOOLEAN DEFAULT false,
    version_id TEXT,
    is_delete_marker BOOLEAN DEFAULT false,
    last_modified TIMESTAMPTZ,
    scanned_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_inventory_scanned
  ON public.storage_inventory_snapshots(scanned_at DESC);

CREATE INDEX IF NOT EXISTS idx_storage_inventory_bucket_key
  ON public.storage_inventory_snapshots(bucket, object_key);

CREATE INDEX IF NOT EXISTS idx_storage_inventory_tenant
  ON public.storage_inventory_snapshots(tenant_id);

CREATE TABLE IF NOT EXISTS public.storage_admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    bucket TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_admin_actions_created
  ON public.storage_admin_actions(created_at DESC);

ALTER TABLE public.storage_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_admin_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on storage objects" ON public.storage_objects;
CREATE POLICY "Service role full access on storage objects"
  ON public.storage_objects
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on storage snapshots" ON public.storage_inventory_snapshots;
CREATE POLICY "Service role full access on storage snapshots"
  ON public.storage_inventory_snapshots
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on storage actions" ON public.storage_admin_actions;
CREATE POLICY "Service role full access on storage actions"
  ON public.storage_admin_actions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------
-- 20260605_add_media_status_columns.sql
-- ------------------------------------------
-- Adiciona colunas de controle de mídia na tabela whatsapp_messages
-- Execute este script no Supabase SQL Editor se o run-migrations falhar

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS media_error TEXT,
  ADD COLUMN IF NOT EXISTS media_retry_count INTEGER NOT NULL DEFAULT 0;

-- Adiciona constraint de check se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_messages'::regclass
      AND conname = 'whatsapp_messages_media_status_check'
  ) THEN
    ALTER TABLE public.whatsapp_messages
      ADD CONSTRAINT whatsapp_messages_media_status_check
      CHECK (media_status IN ('none', 'pending', 'downloading', 'processing', 'ready', 'failed', 'expired'));
  END IF;
END $$;

-- Atualiza registros de mídia existentes
UPDATE public.whatsapp_messages
SET media_status = CASE
    WHEN COALESCE(media_url, '') <> '' THEN 'ready'
    WHEN type IN ('image', 'audio', 'video', 'document', 'sticker') THEN 'pending'
    ELSE 'none'
  END
WHERE media_status = 'none'
  AND type IN ('image', 'audio', 'video', 'document', 'sticker');

-- ------------------------------------------
-- 20260608_ai_agent_orchestration.sql
-- ------------------------------------------
-- AI Agent Orchestration - lead scoring, next actions and visit scheduling

ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_profile JSONB DEFAULT '{}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_next_action TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_last_intent TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_last_confidence NUMERIC(4,3);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_visit_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_org_score
  ON leads(organization_id, lead_score DESC);

CREATE INDEX IF NOT EXISTS idx_leads_org_next_follow_up
  ON leads(organization_id, next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_org_next_visit
  ON leads(organization_id, next_visit_at)
  WHERE next_visit_at IS NOT NULL;

ALTER TABLE lead_followups ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'follow_up';
ALTER TABLE lead_followups ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ------------------------------------------
-- 20260608_orulo_catalog_integration.sql
-- ------------------------------------------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_updated_at TEXT,
  ADD COLUMN IF NOT EXISTS external_listing_status TEXT,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_org_source_external
  ON public.properties (organization_id, source, external_id)
  WHERE source IS NOT NULL AND external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_orulo_review
  ON public.properties (organization_id, source, status, imported_at DESC)
  WHERE source = 'orulo';

-- ------------------------------------------
-- 20260609_valuation_and_documents.sql
-- ------------------------------------------
-- Migration: Valuation System + Document Intelligence
-- Habilita PostGIS (se ainda nao ativo)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ============================================
-- 1. PRICE HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  price NUMERIC(14,2) NOT NULL,
  price_per_ha NUMERIC(10,2),
  price_per_m2 NUMERIC(10,2),
  source TEXT DEFAULT 'manual',
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_property
  ON price_history(property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_history_created
  ON price_history(created_at DESC);

-- Trigger para capturar mudancas de preco automaticamente
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
DECLARE
  area_ha NUMERIC;
  area_m2 NUMERIC;
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    area_ha := COALESCE((NEW.features->>'areaHectares')::numeric, 0);
    area_m2 := COALESCE((NEW.features->>'areaM2')::numeric, 0);

    INSERT INTO price_history (
      property_id, price,
      price_per_ha, price_per_m2,
      source, metadata
    ) VALUES (
      NEW.id, NEW.price,
      CASE WHEN area_ha > 0 THEN ROUND(NEW.price / area_ha, 2) ELSE NULL END,
      CASE WHEN area_m2 > 0 THEN ROUND(NEW.price / area_m2, 2) ELSE NULL END,
      'system',
      jsonb_build_object('old_price', OLD.price, 'updated_at', now())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_price_change ON properties;
CREATE TRIGGER trg_log_price_change
  AFTER UPDATE OF price ON properties
  FOR EACH ROW EXECUTE FUNCTION log_price_change();

-- ============================================
-- 2. PROPERTY VALUATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS property_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  estimated_value NUMERIC(14,2) NOT NULL,
  min_value NUMERIC(14,2),
  max_value NUMERIC(14,2),
  confidence REAL DEFAULT 0.0,

  method TEXT NOT NULL CHECK (method IN ('rule_based', 'hedonic', 'comparative', 'ml_model', 'manual')),
  model_version TEXT,

  currency TEXT DEFAULT 'BRL',
  factors JSONB DEFAULT '[]',
  breakdown JSONB DEFAULT '{}',
  rules_applied TEXT[] DEFAULT '{}',

  triggered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_valuations_property
  ON property_valuations(property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_valuations_org
  ON property_valuations(organization_id);

-- ============================================
-- 3. VALUATION RULES (regras de negocio)
-- ============================================
CREATE TABLE IF NOT EXISTS valuation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('base_price', 'multiplier', 'premium', 'deduction')),
  property_type TEXT,
  city TEXT,
  state TEXT,
  conditions JSONB NOT NULL DEFAULT '{}',
  value NUMERIC(12,4) NOT NULL,
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_valuation_rules_org
  ON valuation_rules(organization_id);

-- ============================================
-- 4. COMPARABLE SALES (vendas comparaveis)
-- ============================================
CREATE TABLE IF NOT EXISTS comparable_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

  sale_price NUMERIC(14,2) NOT NULL,
  sale_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'internal',
  source_url TEXT,

  property_type TEXT,
  city TEXT,
  state TEXT,
  neighborhood TEXT,
  area_ha NUMERIC(10,2),
  area_m2 NUMERIC(10,2),
  features_summary JSONB DEFAULT '{}',

  reliability REAL DEFAULT 0.5,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comparable_city
  ON comparable_sales(city, state);

CREATE INDEX IF NOT EXISTS idx_comparable_type
  ON comparable_sales(property_type);

-- ============================================
-- 5. MARKET INDICATORS
-- ============================================
CREATE TABLE IF NOT EXISTS market_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_key TEXT UNIQUE NOT NULL,
  indicator_type TEXT NOT NULL,
  city TEXT,
  state TEXT,
  value NUMERIC(14,4) NOT NULL,
  unit TEXT,
  source TEXT NOT NULL,
  reference_date DATE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_indicators_key
  ON market_indicators(indicator_key);

CREATE INDEX IF NOT EXISTS idx_market_indicators_city
  ON market_indicators(city, state);

-- ============================================
-- 6. DOCUMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,

  bucket TEXT NOT NULL DEFAULT 'documents',
  object_key TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  sha256 TEXT,

  document_type TEXT CHECK (document_type IN (
    'ESCRITURA', 'MATRICULA', 'CAR', 'CCIR', 'ITR', 'IPTU',
    'CONTRATO', 'CND', 'PROCURACAO', 'RG', 'CPF', 'CNPJ',
    'COMPROVANTE_ENDERECO', 'COMPROVANTE_RENDA', 'OUTRO'
  )),
  classification_confidence REAL,
  classified_by TEXT CHECK (classified_by IN ('ia', 'manual')),
  classified_at TIMESTAMPTZ,

  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'analyzed', 'failed', 'validated'
  )),
  processing_error TEXT,

  raw_text TEXT,
  ocr_confidence REAL,

  extracted_data JSONB DEFAULT '{}',

  validation_score REAL CHECK (validation_score >= 0 AND validation_score <= 100),
  validation_status TEXT CHECK (validation_status IN ('unchecked', 'valid', 'inconsistent', 'failed')),
  validation_details JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_doc_type_per_property UNIQUE (organization_id, property_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_documents_property
  ON documents(property_id);

CREATE INDEX IF NOT EXISTS idx_documents_org
  ON documents(organization_id);

CREATE INDEX IF NOT EXISTS idx_documents_status
  ON documents(status);

CREATE INDEX IF NOT EXISTS idx_documents_type
  ON documents(document_type);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation documents" ON documents;
CREATE POLICY "Tenant isolation documents" ON documents
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 7. DOCUMENT ANALYSES
-- ============================================
CREATE TABLE IF NOT EXISTS document_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,

  analysis_type TEXT NOT NULL CHECK (analysis_type IN (
    'ocr', 'classification', 'extraction', 'validation', 'cross_reference'
  )),
  provider TEXT NOT NULL,
  model_name TEXT,

  input_tokens INT,
  output_tokens INT,
  confidence REAL,
  processing_time_ms INT,

  result JSONB DEFAULT '{}',
  error TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_analyses_document
  ON document_analyses(document_id);

-- ============================================
-- 8. EXTERNAL DATA CACHE
-- ============================================
CREATE TABLE IF NOT EXISTS external_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  data JSONB NOT NULL,
  etag TEXT,
  ttl_seconds INT DEFAULT 86400,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '1 day')
);

CREATE INDEX IF NOT EXISTS idx_cache_expires
  ON external_data_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_cache_source
  ON external_data_cache(source);

-- ============================================
-- 9. IBGE MUNICIPIOS (malha geografica)
-- ============================================
CREATE TABLE IF NOT EXISTS ibge_municipios (
  codigo_ibge TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  uf TEXT NOT NULL,
  regiao TEXT,
  geom geometry(MultiPolygon, 4326),
  area_km2 NUMERIC(12,2),
  populacao INT,
  pib_per_capita NUMERIC(12,2),
  idh NUMERIC(4,3),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ibge_municipios_geom
  ON ibge_municipios USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_ibge_municipios_uf
  ON ibge_municipios(uf);

CREATE INDEX IF NOT EXISTS idx_ibge_municipios_nome
  ON ibge_municipios(nome);

ALTER TABLE ibge_municipios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read ibge_municipios" ON ibge_municipios;
CREATE POLICY "Public read ibge_municipios" ON ibge_municipios
  FOR SELECT USING (true);

-- ============================================
-- SEED: valuation_rules default
-- ============================================
INSERT INTO valuation_rules (organization_id, name, description, rule_type, property_type, conditions, value, priority) VALUES
  (NULL, 'Topografia Plana', '+10% para terrenos planos (melhor aptidao mecanizavel)', 'multiplier', 'RURAL', '{"topography": "Plana"}', 1.10, 10),
  (NULL, 'Topografia Levemente Ondulada', '+5% para relevo suave', 'multiplier', 'RURAL', '{"topography": "Levemente Ondulada"}', 1.05, 10),
  (NULL, 'Topografia Ondulada', '-15% para relevo ondulado (menos mecanizavel)', 'multiplier', 'RURAL', '{"topography": "Ondulada"}', 0.85, 10),
  (NULL, 'Topografia Montanhosa', '-35% para relevo montanhoso', 'multiplier', 'RURAL', '{"topography": "Montanhosa"}', 0.65, 10),
  (NULL, 'Solo Terra Roxa', '+15% para terra roxa (alta fertilidade)', 'multiplier', 'RURAL', '{"soilTexture": "Terra Roxa"}', 1.15, 10),
  (NULL, 'Solo Massape', '+10% para massape (boa fertilidade)', 'multiplier', 'RURAL', '{"soilTexture": "Massapê"}', 1.10, 10),
  (NULL, 'Solo Latossolo', '0% para latossolo (media fertilidade)', 'multiplier', 'RURAL', '{"soilTexture": "Latossolo"}', 1.00, 10),
  (NULL, 'Solo Argiloso', '+5% para solo argiloso', 'multiplier', 'RURAL', '{"soilTexture": "Argiloso"}', 1.05, 10),
  (NULL, 'Solo Misto', '0% para solo misto', 'multiplier', 'RURAL', '{"soilTexture": "Misto"}', 1.00, 10),
  (NULL, 'Solo Arenoso', '-20% para solo arenoso (baixa fertilidade)', 'multiplier', 'RURAL', '{"soilTexture": "Arenoso"}', 0.80, 10),
  (NULL, 'Com CAR', '+5% se possui Cadastro Ambiental Rural', 'multiplier', 'RURAL', '{"legal.car": true}', 1.05, 20),
  (NULL, 'Com SIGEF', '+3% se possui georreferenciamento SIGEF', 'multiplier', 'RURAL', '{"legal.geo": true}', 1.03, 20),
  (NULL, 'Com CCIR', '+2% se possui CCIR', 'multiplier', 'RURAL', '{"legal.ccir": true}', 1.02, 20),
  (NULL, 'Com ITR', '+2% se possui ITR regular', 'multiplier', 'RURAL', '{"legal.itr": true}', 1.02, 20),
  (NULL, 'Casa Sede', '+R$ 50k se possui casa sede', 'premium', 'RURAL', '{"infra.casaSede": true}', 50000, 30),
  (NULL, 'Curral/Brete', '+R$ 15k se possui curral e brete', 'premium', 'RURAL', '{"infra.curral": true, "infra.brete": true}', 15000, 30),
  (NULL, 'Galpao', '+R$ 10k por galao', 'premium', 'RURAL', '{"infra.galpaes": {"min": 1}}', 10000, 30),
  (NULL, 'Energia Eletrica', '+3% se possui energia eletrica', 'multiplier', 'RURAL', '{"infra.energiaEletrica": true}', 1.03, 20),
  (NULL, 'Poco Artesiano', '+2% se possui poco artesiano', 'multiplier', 'RURAL', '{"infra.pocoArtesiano": true}', 1.02, 20),
  (NULL, 'Irrigacao', '+5% se possui sistema de irrigacao', 'multiplier', 'RURAL', '{"infra.irrigacao": true}', 1.05, 20),
  (NULL, 'Pivot Central', '+8% se possui pivot central', 'multiplier', 'RURAL', '{"infra.pivotCentral": true}', 1.08, 20),
  (NULL, 'Rio', '+5% se possui rio na propriedade', 'multiplier', 'RURAL', '{"water.rio": true}', 1.05, 25),
  (NULL, 'Nascente', '+3% se possui nascente', 'multiplier', 'RURAL', '{"water.nascente": true}', 1.03, 25),
  (NULL, 'Represa/Acude', '+4% se possui represa ou acude', 'multiplier', 'RURAL', '{"water.represa": true}', 1.04, 25);

-- ============================================
-- 10. DOCUMENT EXTERNAL VALIDATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS document_external_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  queried_at TIMESTAMPTZ DEFAULT now(),
  response_status TEXT,
  matched BOOLEAN,
  match_confidence REAL,
  response_data JSONB DEFAULT '{}',
  response_time_ms INT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_ext_val_document
  ON document_external_validations(document_id);

CREATE INDEX IF NOT EXISTS idx_doc_ext_val_source
  ON document_external_validations(source);

ALTER TABLE document_external_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on doc ext validations" ON document_external_validations;
CREATE POLICY "Service role full access on doc ext validations"
  ON document_external_validations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

SELECT 'Migration 20260609_valuation_and_documents completed successfully!' AS result;

-- ------------------------------------------
-- 20260610_portal_integrations.sql
-- ------------------------------------------
-- Portal integrations (VivaReal, Zap Imóveis, QuintoAndar, ImovelWeb)
-- Each organization can configure credentials per portal

CREATE TABLE IF NOT EXISTS public.portal_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    portal TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT portal_integrations_org_portal_unique UNIQUE (organization_id, portal)
);

CREATE INDEX IF NOT EXISTS idx_portal_integrations_org
  ON public.portal_integrations(organization_id);

CREATE INDEX IF NOT EXISTS idx_portal_integrations_portal
  ON public.portal_integrations(portal);

ALTER TABLE public.portal_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on portal integrations" ON public.portal_integrations;
CREATE POLICY "Service role full access on portal integrations"
  ON public.portal_integrations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Track publish status per portal per property
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS portal_publishes JSONB DEFAULT '{}'::jsonb;

-- ------------------------------------------
-- 20260611_whatsapp_attendance_assignment.sql
-- ------------------------------------------
-- Adds CRM ownership support used by the WhatsApp attendance transfer action.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to
  ON public.leads(organization_id, assigned_to);

-- ------------------------------------------
-- 20260612_fix_oka_profile_tenant.sql
-- ------------------------------------------
-- Ensure OKA owner/admin profiles are linked to the OKA organization.
-- This keeps tenant-scoped routes such as /api/quiz/campaigns available
-- for both historical OKA login emails.

update public.profiles
set
  organization_id = '0e2dc1dc-825c-4eb1-8e2e-dc70a257eca3',
  role = 'admin',
  updated_at = now()
where lower(email) in ('contato@oka.com.br', 'contato@okaimoveis.com.br');

-- ------------------------------------------
-- 20260612_quiz_campaigns.sql
-- ------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS campaign TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_profile JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.quiz_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  property_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  whatsapp_number TEXT NOT NULL,
  qualification_threshold INTEGER NOT NULL DEFAULT 70 CHECK (qualification_threshold BETWEEN 0 AND 100),
  intro_title TEXT NOT NULL,
  intro_copy TEXT NOT NULL,
  success_message TEXT NOT NULL,
  disqualification_message TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS quiz_campaigns_public_slug_key
  ON public.quiz_campaigns (slug)
  WHERE status <> 'archived';

CREATE TABLE IF NOT EXISTS public.quiz_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.quiz_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  qualification_status TEXT NOT NULL CHECK (qualification_status IN ('qualified', 'nurture')),
  disqualification_reasons TEXT[] NOT NULL DEFAULT '{}',
  utm JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_campaigns_org_status_idx
  ON public.quiz_campaigns (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS quiz_submissions_campaign_created_idx
  ON public.quiz_submissions (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quiz_submissions_org_qualification_idx
  ON public.quiz_submissions (organization_id, qualification_status, created_at DESC);

ALTER TABLE public.quiz_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quiz_campaigns_tenant_select ON public.quiz_campaigns;
CREATE POLICY quiz_campaigns_tenant_select ON public.quiz_campaigns
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS quiz_campaigns_tenant_write ON public.quiz_campaigns;
CREATE POLICY quiz_campaigns_tenant_write ON public.quiz_campaigns
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS quiz_submissions_tenant_select ON public.quiz_submissions;
CREATE POLICY quiz_submissions_tenant_select ON public.quiz_submissions
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DO $$
DECLARE
  oka_org_id UUID;
BEGIN
  SELECT id INTO oka_org_id
  FROM public.organizations
  WHERE lower(slug) = 'okaimoveis'
     OR lower(custom_domain) IN ('okaimoveis.com.br', 'www.okaimoveis.com.br')
  ORDER BY created_at ASC
  LIMIT 1;

  IF oka_org_id IS NOT NULL THEN
    INSERT INTO public.quiz_campaigns (
      organization_id,
      title,
      slug,
      property_label,
      status,
      whatsapp_number,
      qualification_threshold,
      intro_title,
      intro_copy,
      success_message,
      disqualification_message,
      questions,
      branding
    ) VALUES (
      oka_org_id,
      'Campanha locação - 3 quartos em Colorado',
      'locacao-3-quartos-colorado',
      'Imóvel de 3 quartos com suíte no centro de Colorado/PR',
      'active',
      '5544997223030',
      70,
      'Este imóvel combina com o momento da sua família?',
      'Responda algumas perguntas rápidas. A OKA usa suas respostas para confirmar se esta locação faz sentido antes de encaminhar você ao atendimento.',
      'Seu perfil é compatível com esta oportunidade. Vamos continuar pelo WhatsApp para confirmar disponibilidade e visita.',
      'Neste momento, não temos um imóvel disponível que corresponda ao seu perfil. Seus dados ficaram registrados para futuras oportunidades da OKA.',
      $questions$[
        {"id":"intent","label":"Você procura um imóvel para morar em Colorado/PR?","type":"single","required":true,"options":[{"value":"yes","label":"Sim, quero morar em Colorado","score":20},{"value":"moving","label":"Estou me mudando para Colorado a trabalho","score":20},{"value":"no","label":"Não, procuro em outra cidade","score":0,"disqualify":true,"reason":"Não pretende morar em Colorado/PR"}]},
        {"id":"household","label":"Para quantas pessoas seria o imóvel?","type":"single","required":true,"options":[{"value":"1","label":"1 pessoa","score":4},{"value":"2-3","label":"2 a 3 pessoas","score":10},{"value":"4-5","label":"4 a 5 pessoas","score":10},{"value":"6+","label":"6 pessoas ou mais","score":5}]},
        {"id":"bedrooms","label":"Você precisa de 3 quartos?","type":"single","required":true,"options":[{"value":"3+","label":"Sim, 3 quartos ou mais","score":15},{"value":"2","label":"Não, 2 quartos seriam suficientes","score":0,"disqualify":true,"reason":"Busca imóvel menor que 3 quartos"},{"value":"1","label":"Procuro kitnet ou 1 quarto","score":0,"disqualify":true,"reason":"Busca kitnet ou quarto"}]},
        {"id":"budget","label":"Qual faixa mensal de aluguel cabe no seu planejamento?","type":"single","required":true,"options":[{"value":"below-1000","label":"Abaixo de R$ 1.000","score":0,"disqualify":true,"reason":"Faixa de aluguel abaixo de R$ 1.000"},{"value":"1000-1299","label":"De R$ 1.000 a R$ 1.299","score":4},{"value":"1300-2000","label":"De R$ 1.300 a R$ 2.000","score":20},{"value":"2001-3000","label":"De R$ 2.001 a R$ 3.000","score":20},{"value":"above-3000","label":"Acima de R$ 3.000","score":20}]},
        {"id":"move_time","label":"Quando pretende se mudar?","type":"single","required":true,"options":[{"value":"15","label":"Em até 15 dias","score":15},{"value":"30","label":"Em até 30 dias","score":15},{"value":"60","label":"Entre 31 e 60 dias","score":8},{"value":"later","label":"Depois de 60 dias ou sem prazo","score":0,"reason":"Sem urgência de mudança"}]},
        {"id":"income","label":"Você possui renda comprovável para o cadastro?","type":"single","required":true,"options":[{"value":"yes","label":"Sim","score":10},{"value":"guarantor","label":"Tenho responsável financeiro ou garantia","score":6},{"value":"no","label":"Não possuo renda ou responsável","score":0,"disqualify":true,"reason":"Sem condição mínima de cadastro"}]},
        {"id":"restrictions","label":"Existe alguma restrição de cadastro que a OKA precisa conhecer?","type":"single","required":true,"options":[{"value":"no","label":"Não","score":5},{"value":"yes","label":"Sim, prefiro explicar no atendimento","score":0,"reason":"Possui restrição de cadastro"}]},
        {"id":"garage","label":"Garagem é importante para você?","type":"single","required":true,"options":[{"value":"yes","label":"Sim","score":3},{"value":"no","label":"Não é essencial","score":1}]},
        {"id":"visit","label":"Se o imóvel estiver disponível, você quer agendar uma visita?","type":"single","required":true,"options":[{"value":"yes","label":"Sim, quero visitar","score":2},{"value":"details","label":"Quero receber mais detalhes primeiro","score":1},{"value":"no","label":"Ainda não","score":0}]}
      ]$questions$::jsonb,
      '{"primary":"#f04b12","charcoal":"#242424","muted":"#6d7178","background":"#faf8f5","logo":"/clients/oka/logo.jpeg"}'::jsonb
    )
    ON CONFLICT (organization_id, slug) DO NOTHING;
  END IF;
END $$;

-- ------------------------------------------
-- 20260612_quiz_public_rpc.sql
-- ------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_quiz(p_slug TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', id, 'title', title, 'slug', slug, 'property_label', property_label,
    'status', status, 'intro_title', intro_title, 'intro_copy', intro_copy,
    'success_message', success_message,
    'disqualification_message', disqualification_message,
    'questions', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', question->>'id', 'label', question->>'label',
        'type', COALESCE(question->>'type', 'single'),
        'required', COALESCE((question->>'required')::boolean, true),
        'options', (SELECT jsonb_agg(jsonb_build_object('value', option->>'value', 'label', option->>'label')) FROM jsonb_array_elements(question->'options') option)
      )) FROM jsonb_array_elements(questions) question
    ),
    'branding', branding, 'created_at', created_at
  )
  FROM public.quiz_campaigns
  WHERE slug = lower(regexp_replace(p_slug, '[^a-zA-Z0-9-]+', '-', 'g'))
    AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_quiz(
  p_slug TEXT, p_name TEXT, p_email TEXT, p_phone TEXT,
  p_answers JSONB, p_utm JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  campaign public.quiz_campaigns%ROWTYPE;
  question JSONB;
  selected JSONB;
  earned NUMERIC := 0;
  maximum NUMERIC := 0;
  maximum_total NUMERIC := 0;
  score_value INTEGER := 0;
  reasons TEXT[] := ARRAY[]::TEXT[];
  summaries JSONB := '[]'::jsonb;
  qualified_value BOOLEAN;
  classification_value TEXT;
  lead_uuid UUID;
  budget_value NUMERIC;
  whatsapp_url TEXT;
BEGIN
  IF length(trim(COALESCE(p_name, ''))) < 2 OR length(regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g')) < 8 THEN
    RAISE EXCEPTION 'Preencha seu nome e WhatsApp.';
  END IF;

  SELECT * INTO campaign FROM public.quiz_campaigns
  WHERE slug = lower(regexp_replace(p_slug, '[^a-zA-Z0-9-]+', '-', 'g')) AND status = 'active'
  LIMIT 1;
  IF campaign.id IS NULL THEN RAISE EXCEPTION 'Quiz não encontrado ou indisponível.'; END IF;

  FOR question IN SELECT value FROM jsonb_array_elements(campaign.questions)
  LOOP
    SELECT COALESCE(MAX((value->>'score')::numeric), 0) INTO maximum FROM jsonb_array_elements(question->'options');
    maximum_total := maximum_total + maximum;
    SELECT value INTO selected FROM jsonb_array_elements(question->'options')
      WHERE value->>'value' = p_answers->>(question->>'id') LIMIT 1;
    IF selected IS NULL THEN
      IF COALESCE((question->>'required')::boolean, true) THEN
        reasons := array_append(reasons, 'Pergunta não respondida: ' || (question->>'label'));
      END IF;
    ELSE
      earned := earned + COALESCE((selected->>'score')::numeric, 0);
      summaries := summaries || jsonb_build_array(jsonb_build_object(
        'id', question->>'id', 'question', question->>'label',
        'value', selected->>'value', 'answer', selected->>'label'
      ));
      IF COALESCE((selected->>'disqualify')::boolean, false) THEN
        reasons := array_append(reasons, COALESCE(selected->>'reason', 'Resposta incompatível: ' || (selected->>'label')));
      END IF;
    END IF;
    selected := NULL;
  END LOOP;

  score_value := CASE WHEN maximum_total > 0 THEN LEAST(100, round((earned / maximum_total) * 100)::integer) ELSE 0 END;
  qualified_value := cardinality(reasons) = 0 AND score_value >= campaign.qualification_threshold;
  classification_value := CASE WHEN qualified_value THEN 'qualified' ELSE 'nurture' END;
  budget_value := CASE p_answers->>'budget'
    WHEN 'below-1000' THEN 999 WHEN '1000-1299' THEN 1299
    WHEN '1300-2000' THEN 2000 WHEN '2001-3000' THEN 3000
    WHEN 'above-3000' THEN 3001 ELSE NULL END;

  INSERT INTO public.leads (
    organization_id, name, email, phone, status, source, campaign, notes,
    budget, classification, lead_score, ai_profile
  ) VALUES (
    campaign.organization_id, trim(p_name), NULLIF(trim(COALESCE(p_email, '')), ''),
    regexp_replace(p_phone, '\D', '', 'g'),
    CASE WHEN qualified_value THEN 'Novo' ELSE 'Nutrição Quiz' END,
    'Quiz OKA', campaign.title,
    'Quiz: ' || campaign.title || E'\nResultado: ' || CASE WHEN qualified_value THEN 'Qualificado' ELSE 'Nutrição futura' END || ' (' || score_value || '/100)',
    budget_value, classification_value, score_value,
    jsonb_build_object('quiz_campaign_id', campaign.id, 'quiz_slug', campaign.slug, 'qualification_status', classification_value, 'answers', summaries, 'reasons', to_jsonb(reasons))
  ) RETURNING id INTO lead_uuid;

  INSERT INTO public.quiz_submissions (
    organization_id, campaign_id, lead_id, name, email, phone, answers,
    score, qualification_status, disqualification_reasons, utm
  ) VALUES (
    campaign.organization_id, campaign.id, lead_uuid, trim(p_name),
    NULLIF(trim(COALESCE(p_email, '')), ''), regexp_replace(p_phone, '\D', '', 'g'),
    p_answers, score_value, classification_value, reasons, COALESCE(p_utm, '{}'::jsonb)
  );

  IF qualified_value THEN
    whatsapp_url := 'https://wa.me/' || regexp_replace(campaign.whatsapp_number, '\D', '', 'g') ||
      '?text=' || replace(replace('Olá! Sou ' || trim(p_name) || E'.\nFui pré-qualificado pelo Quiz OKA para: ' || campaign.property_label || E'.\nPontuação: ' || score_value || E'/100.\nQuero confirmar a disponibilidade e agendar uma visita.', ' ', '%20'), E'\n', '%0A');
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'qualified', qualified_value, 'score', score_value,
    'message', CASE WHEN qualified_value THEN campaign.success_message ELSE campaign.disqualification_message END,
    'whatsapp_url', whatsapp_url
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_quiz(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_public_quiz(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_quiz(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_quiz(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO anon, authenticated;

-- ------------------------------------------
-- 20260613_whatsapp_hardening_pipeline.sql
-- ------------------------------------------
-- Hardening for WhatsApp receipts, async media worker and PostgreSQL-backed sessions.

ALTER TABLE IF EXISTS public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'sent';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_messages'::regclass
      AND conname = 'whatsapp_messages_delivery_status_check'
  ) THEN
    ALTER TABLE public.whatsapp_messages
      ADD CONSTRAINT whatsapp_messages_delivery_status_check
      CHECK (delivery_status IN ('sent', 'delivered', 'read', 'played', 'failed'));
  END IF;
END $$;

ALTER TABLE IF EXISTS public.whatsapp_media
  ADD COLUMN IF NOT EXISTS whatsapp_payload BYTEA,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_message_id TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_media_worker_pending
  ON public.whatsapp_media(status, next_retry_at, retry_count, updated_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_delivery_status
  ON public.whatsapp_messages(instance_id, delivery_status, timestamp DESC);

-- ------------------------------------------
-- 20260614_quiz_multi_niche_rural.sql
-- ------------------------------------------
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS match_profile TEXT;

CREATE OR REPLACE FUNCTION public.submit_public_quiz(
  p_slug TEXT, p_name TEXT, p_email TEXT, p_phone TEXT,
  p_answers JSONB, p_utm JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  campaign public.quiz_campaigns%ROWTYPE;
  question JSONB;
  selected JSONB;
  earned NUMERIC := 0;
  maximum NUMERIC := 0;
  maximum_total NUMERIC := 0;
  score_value INTEGER := 0;
  reasons TEXT[] := ARRAY[]::TEXT[];
  summaries JSONB := '[]'::jsonb;
  qualified_value BOOLEAN;
  classification_value TEXT;
  lead_uuid UUID;
  budget_value NUMERIC;
  whatsapp_url TEXT;
  lead_source_value TEXT;
  match_profile_value TEXT;
BEGIN
  IF length(trim(COALESCE(p_name, ''))) < 2 OR length(regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g')) < 8 THEN
    RAISE EXCEPTION 'Preencha seu nome e WhatsApp.';
  END IF;

  SELECT * INTO campaign FROM public.quiz_campaigns
  WHERE slug = lower(regexp_replace(p_slug, '[^a-zA-Z0-9-]+', '-', 'g')) AND status = 'active'
  LIMIT 1;
  IF campaign.id IS NULL THEN RAISE EXCEPTION 'Quiz nao encontrado ou indisponivel.'; END IF;

  lead_source_value := COALESCE(
    campaign.branding->>'lead_source',
    CASE WHEN campaign.branding->>'match_profile' = 'rural' OR campaign.branding->>'niche' = 'rural'
      THEN 'Quiz Rural'
      ELSE 'Quiz Urbano'
    END
  );
  match_profile_value := CASE
    WHEN campaign.branding->>'match_profile' = 'rural' OR campaign.branding->>'niche' = 'rural' THEN 'rural'
    ELSE 'urbano'
  END;

  FOR question IN SELECT value FROM jsonb_array_elements(campaign.questions)
  LOOP
    SELECT COALESCE(MAX((value->>'score')::numeric), 0) INTO maximum FROM jsonb_array_elements(question->'options');
    maximum_total := maximum_total + maximum;
    SELECT value INTO selected FROM jsonb_array_elements(question->'options')
      WHERE value->>'value' = p_answers->>(question->>'id') LIMIT 1;
    IF selected IS NULL THEN
      IF COALESCE((question->>'required')::boolean, true) THEN
        reasons := array_append(reasons, 'Pergunta nao respondida: ' || (question->>'label'));
      END IF;
    ELSE
      earned := earned + COALESCE((selected->>'score')::numeric, 0);
      summaries := summaries || jsonb_build_array(jsonb_build_object(
        'id', question->>'id', 'question', question->>'label',
        'value', selected->>'value', 'answer', selected->>'label'
      ));
      IF COALESCE((selected->>'disqualify')::boolean, false) THEN
        reasons := array_append(reasons, COALESCE(selected->>'reason', 'Resposta incompativel: ' || (selected->>'label')));
      END IF;
    END IF;
    selected := NULL;
  END LOOP;

  score_value := CASE WHEN maximum_total > 0 THEN LEAST(100, round((earned / maximum_total) * 100)::integer) ELSE 0 END;
  qualified_value := cardinality(reasons) = 0 AND score_value >= campaign.qualification_threshold;
  classification_value := CASE WHEN qualified_value THEN 'qualified' ELSE 'nurture' END;
  budget_value := CASE p_answers->>'budget'
    WHEN 'below-1000' THEN 999 WHEN '1000-1299' THEN 1299
    WHEN '1300-2000' THEN 2000 WHEN '2001-3000' THEN 3000
    WHEN 'above-3000' THEN 3001 ELSE NULL END;

  INSERT INTO public.leads (
    organization_id, name, email, phone, status, source, campaign, notes,
    budget, classification, lead_score, match_profile, ai_profile
  ) VALUES (
    campaign.organization_id, trim(p_name), NULLIF(trim(COALESCE(p_email, '')), ''),
    regexp_replace(p_phone, '\D', '', 'g'),
    CASE WHEN qualified_value THEN 'Novo' ELSE 'Nutricao Quiz' END,
    lead_source_value, campaign.title,
    'Quiz: ' || campaign.title || E'\nResultado: ' || CASE WHEN qualified_value THEN 'Qualificado' ELSE 'Nutricao futura' END || ' (' || score_value || '/100)',
    budget_value, classification_value, score_value, match_profile_value,
    jsonb_build_object(
      'quiz_campaign_id', campaign.id,
      'quiz_slug', campaign.slug,
      'lead_source', lead_source_value,
      'match_profile', match_profile_value,
      'qualification_status', classification_value,
      'answers', summaries,
      'reasons', to_jsonb(reasons)
    )
  ) RETURNING id INTO lead_uuid;

  INSERT INTO public.quiz_submissions (
    organization_id, campaign_id, lead_id, name, email, phone, answers,
    score, qualification_status, disqualification_reasons, utm
  ) VALUES (
    campaign.organization_id, campaign.id, lead_uuid, trim(p_name),
    NULLIF(trim(COALESCE(p_email, '')), ''), regexp_replace(p_phone, '\D', '', 'g'),
    p_answers, score_value, classification_value, reasons, COALESCE(p_utm, '{}'::jsonb)
  );

  IF qualified_value THEN
    whatsapp_url := 'https://wa.me/' || regexp_replace(campaign.whatsapp_number, '\D', '', 'g') ||
      '?text=' || replace(replace(
        'Ola! Sou ' || trim(p_name) || E'.\nFui pre-qualificado pelo ' || lead_source_value || ' para: ' || campaign.property_label || E'.\nPontuacao: ' || score_value || E'/100.\n' ||
        CASE WHEN match_profile_value = 'rural'
          THEN 'Quero confirmar os dados tecnicos, disponibilidade e visita.'
          ELSE 'Quero confirmar a disponibilidade e agendar uma visita.'
        END,
        ' ', '%20'), E'\n', '%0A');
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'qualified', qualified_value, 'score', score_value,
    'message', CASE WHEN qualified_value THEN campaign.success_message ELSE campaign.disqualification_message END,
    'whatsapp_url', whatsapp_url
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_quiz(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_quiz(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO anon, authenticated;

-- ------------------------------------------
-- 20260617_orulo_global_and_user_credentials.sql
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_integrations (
  provider TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  encrypted_credentials TEXT NOT NULL,
  configured_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orulo_user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  encrypted_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_orulo_user_credentials_user
  ON public.orulo_user_credentials (user_id, organization_id);

ALTER TABLE public.platform_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orulo_user_credentials ENABLE ROW LEVEL SECURITY;

-- Remove segredos antigos do JSON carregado no frontend. Usuários que já haviam
-- autorizado a Órulo precisarão conectar a conta novamente uma única vez.
UPDATE public.site_settings
SET integrations = jsonb_set(
  COALESCE(integrations, '{}'::jsonb),
  '{orulo}',
  COALESCE(integrations->'orulo', '{}'::jsonb)
    - 'clientId'
    - 'client_id'
    - 'clientSecret'
    - 'client_secret'
    - 'endUserAuth',
  true
)
WHERE COALESCE(integrations, '{}'::jsonb) ? 'orulo';

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------
-- 20260618_consolidate_crm_rls.sql
-- ------------------------------------------
-- Consolidate CRM tenant policies. Service-role traffic bypasses RLS.

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
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

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brokers can manage leads in organization" ON public.leads;
DROP POLICY IF EXISTS "Tenant isolation for leads" ON public.leads;
DROP POLICY IF EXISTS "Tenant isolation leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view leads in organization" ON public.leads;
DROP POLICY IF EXISTS "leads_isolation" ON public.leads;
DROP POLICY IF EXISTS "tenant_leads" ON public.leads;

CREATE POLICY "Tenant isolation leads" ON public.leads
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  )
  WITH CHECK (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "Brokers can manage properties in organization" ON public.properties;
DROP POLICY IF EXISTS "Tenant isolation for properties" ON public.properties;
DROP POLICY IF EXISTS "Tenant isolation properties" ON public.properties;
DROP POLICY IF EXISTS "Users can view properties in organization" ON public.properties;
DROP POLICY IF EXISTS "tenant_properties" ON public.properties;
DROP POLICY IF EXISTS "Public read available properties" ON public.properties;

CREATE POLICY "Tenant isolation properties" ON public.properties
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  )
  WITH CHECK (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  );

CREATE POLICY "Public read available properties" ON public.properties
  FOR SELECT TO anon
  USING (status IN ('Disponivel', 'Disponível', 'available', 'publicado'));

DROP POLICY IF EXISTS "Service role full access on lead_tags" ON public.lead_tags;
DROP POLICY IF EXISTS "Tenant isolation lead_tags" ON public.lead_tags;

CREATE POLICY "Tenant isolation lead_tags" ON public.lead_tags
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  )
  WITH CHECK (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can insert activities in their organization" ON public.lead_activities;
DROP POLICY IF EXISTS "Users can see activities of their organization" ON public.lead_activities;
DROP POLICY IF EXISTS "Tenant isolation lead_activities" ON public.lead_activities;

CREATE POLICY "Tenant isolation lead_activities" ON public.lead_activities
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  )
  WITH CHECK (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  );

ANALYZE public.leads;
ANALYZE public.properties;
ANALYZE public.lead_tags;
ANALYZE public.lead_activities;

-- ------------------------------------------
-- 20260618_performance_indexes.sql
-- ------------------------------------------
-- Performance indexes for Kanban cursor pagination and CRM detail.
-- This file must be executed without wrapping it in an explicit transaction.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_kanban_stage_cursor
  ON public.leads (organization_id, status, created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_created_cursor
  ON public.leads (organization_id, created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_activities_org_lead_created
  ON public.lead_activities (organization_id, lead_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_phone
  ON public.leads (organization_id, phone);

-- Validated on 2026-06-18 using pg_stat_user_indexes:
-- idx_leads_organization and idx_properties_organization had zero scans,
-- while their equivalent indexes were actively used.
DROP INDEX CONCURRENTLY IF EXISTS public.idx_leads_organization;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_properties_organization;

-- ------------------------------------------
-- 20260619_lease_management_complete.sql
-- ------------------------------------------
-- ============================================================
-- Migration: Lease Management Complete Module
-- Novo módulo de Gestão de Locação do ImobFluow
-- Base: Lei 8.245/91 (Lei do Inquilinato)
-- ============================================================

-- 0. Helper functions
CREATE OR REPLACE FUNCTION generate_contract_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(contract_number, '-', 1) AS INTEGER)), 0) + 1
  INTO seq
  FROM leases
  WHERE organization_id = org_id;
  RETURN LPAD(seq::TEXT, 5, '0') || '-' || TO_CHAR(NOW(), 'YYYY');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. LEASES (contrato de locação) — tabela principal
-- ============================================================
CREATE TABLE IF NOT EXISTS leases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  contract_number TEXT,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft','cadastral_analysis','income_analysis',
      'pending_signatures','active','suspended','terminated','expired','archived'
    )),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  signed_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,

  -- Relacionamentos
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Locatário principal (PF ou PJ)
  tenant_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  tenant_name TEXT,
  tenant_email TEXT,
  tenant_phone TEXT,
  tenant_cpf TEXT,
  tenant_rg TEXT,
  tenant_type TEXT CHECK (tenant_type IN ('PF', 'PJ')),
  tenant_birth_date DATE,
  tenant_marital_status TEXT,
  tenant_profession TEXT,
  tenant_employer TEXT,
  tenant_monthly_income NUMERIC(12,2),

  -- Cônjuge / co-locatários
  co_tenants UUID[] DEFAULT '{}',

  -- Fiador
  guarantor_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  guarantor_name TEXT,
  guarantor_cpf TEXT,
  guarantor_phone TEXT,
  guarantor_email TEXT,
  guarantor_monthly_income NUMERIC(12,2),

  -- Testemunhas
  witness_1_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  witness_1_name TEXT,
  witness_1_cpf TEXT,
  witness_2_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  witness_2_name TEXT,
  witness_2_cpf TEXT,

  -- Garantia
  guarantee_type TEXT CHECK (guarantee_type IN ('fiador','seguro_fianca','deposito_caucao','titulo_capitalizacao','sem')),
  guarantee_value NUMERIC(12,2),
  guarantee_details JSONB,
  caution_amount NUMERIC(12,2),
  caution_payment_date DATE,
  insurance_company TEXT,
  insurance_policy_number TEXT,

  -- Condições Comerciais
  monthly_rent NUMERIC(12,2) NOT NULL DEFAULT 0,
  condominium_fee NUMERIC(10,2) DEFAULT 0,
  iptu_amount NUMERIC(10,2) DEFAULT 0,
  due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
  adjustment_index TEXT DEFAULT 'IGPM',
  adjustment_period_months INTEGER DEFAULT 12,
  late_fee_percent NUMERIC(5,2) DEFAULT 2.00,
  late_interest_percent NUMERIC(8,5) DEFAULT 0.03333,
  currency_correction BOOLEAN DEFAULT true,

  start_date DATE,
  end_date DATE,
  contract_duration_months INTEGER,
  occupation_date DATE,
  key_delivery_date DATE,
  rental_purpose TEXT,

  commission_percent NUMERIC(5,2) DEFAULT 0,
  commission_payer TEXT CHECK (commission_payer IN ('locador','locatario','ambos')),

  -- Assinatura
  signature_method TEXT,
  signature_status TEXT DEFAULT 'pending'
    CHECK (signature_status IN ('pending','sent','partially_signed','signed','refused','expired')),
  signed_document_url TEXT,

  -- Análise cadastral
  evaluation_score INTEGER DEFAULT 0,
  evaluation_status TEXT DEFAULT 'em_analise'
    CHECK (evaluation_status IN ('em_analise','aprovado','aprovado_com_ressalva','reprovado')),
  credit_score INTEGER,
  has_restrictions BOOLEAN DEFAULT false,
  restriction_notes TEXT,
  analysis_notes TEXT,

  -- Financeiro
  payment_status TEXT DEFAULT 'em_dia'
    CHECK (payment_status IN ('em_dia','atrasado','inadimplente')),

  -- Metadata
  current_template_id UUID,
  last_rent_adjustment DATE,
  next_rent_adjustment DATE,
  renewal_count INTEGER DEFAULT 0,
  previous_lease_id UUID REFERENCES leases(id),

  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- 2. CONTRACT TEMPLATES (modelos de contrato persistentes)
-- ============================================================
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'locacao',
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  source_file_url TEXT,
  source_file_name TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. CONTRACT VERSIONS (histórico de versões)
-- ============================================================
CREATE TABLE IF NOT EXISTS contract_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES contract_templates(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  change_log TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. GENERATED CONTRACTS (contratos gerados)
-- ============================================================
CREATE TABLE IF NOT EXISTS generated_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  template_id UUID REFERENCES contract_templates(id),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_html TEXT,
  pdf_url TEXT,
  docx_url TEXT,
  hash_sha256 TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. SIGNATURES (registro de assinaturas)
-- ============================================================
CREATE TABLE IF NOT EXISTS signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL CHECK (signer_type IN ('locador','locatario','fiador','co_locatario','testemunha_1','testemunha_2')),
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signer_phone TEXT,
  signer_cpf TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','signed','refused','expired')),
  signed_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  signature_hash TEXT,
  document_hash TEXT,
  signature_provider TEXT,
  provider_signature_id TEXT,
  invitation_sent_at TIMESTAMPTZ,
  invitation_method TEXT CHECK (invitation_method IN ('whatsapp','email','ambos')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. INSPECTIONS (vistorias)
-- ============================================================
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('entrada','saida','periodica')),
  inspection_date DATE NOT NULL,
  inspector_name TEXT,
  tenant_present BOOLEAN DEFAULT false,
  owner_present BOOLEAN DEFAULT false,
  items JSONB DEFAULT '[]',
  meter_readings JSONB,
  notes TEXT,
  report_url TEXT,
  signed_by_tenant BOOLEAN DEFAULT false,
  signed_by_owner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. INVOICES (boletos/cobranças)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number TEXT,
  due_date DATE NOT NULL,
  reference_month DATE,
  amount NUMERIC(12,2) NOT NULL,
  rent_amount NUMERIC(12,2),
  condominium_amount NUMERIC(10,2),
  iptu_amount NUMERIC(10,2),
  late_fee NUMERIC(10,2) DEFAULT 0,
  late_interest NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','vencido','pago','cancelado','protestado')),
  payment_date DATE,
  payment_method TEXT,
  payment_proof_url TEXT,
  barcode TEXT,
  nossonumero TEXT,
  invoice_url TEXT,
  pix_code TEXT,
  paid_amount NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. RENT ADJUSTMENTS (histórico de reajustes)
-- ============================================================
CREATE TABLE IF NOT EXISTS rent_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  previous_rent NUMERIC(12,2) NOT NULL,
  new_rent NUMERIC(12,2) NOT NULL,
  adjustment_index TEXT NOT NULL,
  index_rate NUMERIC(8,5),
  adjustment_date DATE NOT NULL,
  calculated_by TEXT DEFAULT 'system',
  approved BOOLEAN DEFAULT false,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. LEASE TERMINATIONS (rescisões)
-- ============================================================
CREATE TABLE IF NOT EXISTS lease_terminations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  termination_type TEXT NOT NULL CHECK (termination_type IN ('acordo','unilateral_locatario','unilateral_locador','quebra_contratual')),
  termination_date DATE NOT NULL,
  fine_amount NUMERIC(12,2),
  fine_paid BOOLEAN DEFAULT false,
  days_notice INTEGER,
  notice_date DATE,
  reason TEXT,
  key_return_date DATE,
  inspection_report_url TEXT,
  settlement_document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 10. LEASE HISTORY (log de alterações)
-- ============================================================
CREATE TABLE IF NOT EXISTS lease_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leases_org_status ON leases(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_property ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_dates ON leases(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leases_org_tenant_name ON leases(organization_id, tenant_name);
CREATE INDEX IF NOT EXISTS idx_invoices_lease_due ON invoices(lease_id, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_contract_templates_org ON contract_templates(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_signatures_lease ON signatures(lease_id);
CREATE INDEX IF NOT EXISTS idx_signatures_status ON signatures(status);
CREATE INDEX IF NOT EXISTS idx_lease_history_lease ON lease_history(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_history_created ON lease_history(created_at);
CREATE INDEX IF NOT EXISTS idx_inspections_lease ON inspections(lease_id);
CREATE INDEX IF NOT EXISTS idx_rent_adjustments_lease ON rent_adjustments(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_terminations_lease ON lease_terminations(lease_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_terminations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES (tenant isolation)
-- ============================================================
CREATE POLICY "Tenant isolation leases" ON leases
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation contract_templates" ON contract_templates
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR organization_id IS NULL);

CREATE POLICY "Tenant isolation contract_versions" ON contract_versions
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation generated_contracts" ON generated_contracts
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation signatures" ON signatures
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation inspections" ON inspections
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation invoices" ON invoices
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation rent_adjustments" ON rent_adjustments
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation lease_terminations" ON lease_terminations
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation lease_history" ON lease_history
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- TRIGGER: Auto-generate contract_number on INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION set_contract_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NULL THEN
    NEW.contract_number := generate_contract_number(NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_contract_number ON leases;
CREATE TRIGGER trg_set_contract_number
  BEFORE INSERT ON leases
  FOR EACH ROW
  EXECUTE FUNCTION set_contract_number();

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leases_updated_at ON leases;
CREATE TRIGGER trg_leases_updated_at
  BEFORE UPDATE ON leases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER: Log lease history on UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION log_lease_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields TEXT[] := '{}';
  field_name TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lease_history (lease_id, organization_id, action, description, field_changed, old_value, new_value, user_id)
    VALUES (NEW.id, NEW.organization_id, 'status_change', 'Status alterado', 'status', OLD.status, NEW.status, NEW.updated_by);
  END IF;

  IF OLD.monthly_rent IS DISTINCT FROM NEW.monthly_rent THEN
    INSERT INTO lease_history (lease_id, organization_id, action, description, field_changed, old_value, new_value, user_id)
    VALUES (NEW.id, NEW.organization_id, 'rent_change', 'Aluguel alterado', 'monthly_rent', OLD.monthly_rent::TEXT, NEW.monthly_rent::TEXT, NEW.updated_by);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lease_history ON leases;
CREATE TRIGGER trg_lease_history
  AFTER UPDATE ON leases
  FOR EACH ROW
  EXECUTE FUNCTION log_lease_changes();

-- ============================================================
-- VIEW: lease_overview (visão consolidada para dashboard)
-- ============================================================
CREATE OR REPLACE VIEW lease_overview AS
SELECT
  l.id,
  l.organization_id,
  l.contract_number,
  l.status,
  l.tenant_name,
  l.tenant_cpf,
  l.tenant_phone,
  l.tenant_email,
  l.property_id,
  p.title AS property_title,
  p.city AS property_city,
  p.state AS property_state,
  l.monthly_rent,
  l.due_day,
  l.start_date,
  l.end_date,
  l.contract_duration_months,
  l.guarantee_type,
  l.evaluation_status,
  l.evaluation_score,
  l.payment_status,
  l.signature_status,
  l.last_rent_adjustment,
  l.next_rent_adjustment,
  l.signed_at,
  l.activated_at,
  l.created_at,
  l.owner_id,
  l.guarantor_name,
  l.occupation_date,
  l.renewal_count,
  -- Indicadores calculados
  CASE
    WHEN l.status = 'active' AND l.end_date IS NOT NULL THEN
      GREATEST(0, (l.end_date - CURRENT_DATE))
    ELSE NULL
  END AS dias_restantes,
  CASE
    WHEN l.status = 'active' AND l.end_date IS NOT NULL THEN
      GREATEST(0, EXTRACT(MONTH FROM age(l.end_date, CURRENT_DATE))::INTEGER)
    ELSE NULL
  END AS meses_restantes
FROM leases l
LEFT JOIN properties p ON p.id = l.property_id;

-- ============================================================
-- VIEW: lease_financial_summary
-- ============================================================
CREATE OR REPLACE VIEW lease_financial_summary AS
SELECT
  l.id AS lease_id,
  l.organization_id,
  l.contract_number,
  l.tenant_name,
  l.monthly_rent,
  l.payment_status,
  l.status,
  l.due_day,
  COALESCE(inv_pend.total_pending, 0) AS total_pending,
  COALESCE(inv_pend.count_pending, 0) AS pending_invoices,
  COALESCE(inv_overdue.total_overdue, 0) AS total_overdue,
  COALESCE(inv_overdue.count_overdue, 0) AS overdue_invoices,
  COALESCE(inv_paid.last_payment_date, NULL) AS last_payment_date,
  l.last_rent_adjustment,
  l.next_rent_adjustment
FROM leases l
LEFT JOIN (
  SELECT lease_id,
    SUM(total) AS total_pending,
    COUNT(*) AS count_pending
  FROM invoices
  WHERE status IN ('pendente', 'vencido')
  GROUP BY lease_id
) inv_pend ON inv_pend.lease_id = l.id
LEFT JOIN (
  SELECT lease_id,
    SUM(total) AS total_overdue,
    COUNT(*) AS count_overdue
  FROM invoices
  WHERE status = 'vencido'
  GROUP BY lease_id
) inv_overdue ON inv_overdue.lease_id = l.id
LEFT JOIN (
  SELECT lease_id,
    MAX(payment_date) AS last_payment_date
  FROM invoices
  WHERE status = 'pago'
  GROUP BY lease_id
) inv_paid ON inv_paid.lease_id = l.id;

-- Done!
SELECT 'Migration Lease Management v1.0 completed successfully!' AS result;

-- ------------------------------------------
-- 20260620_rural_operations_modules.sql
-- ------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.rural_financial_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  target_vgv NUMERIC(16,2) NOT NULL DEFAULT 0,
  target_sales INTEGER NOT NULL DEFAULT 0,
  commission_rate NUMERIC(7,4) NOT NULL DEFAULT 0.05,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, period_month)
);

CREATE TABLE IF NOT EXISTS public.rural_property_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, property_id)
);

CREATE TABLE IF NOT EXISTS public.rural_property_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rural_goals_org_period
  ON public.rural_financial_goals (organization_id, period_month DESC);
CREATE INDEX IF NOT EXISTS idx_rural_favorites_profile
  ON public.rural_property_favorites (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rural_visits_profile_date
  ON public.rural_property_visits (profile_id, scheduled_at DESC);

ALTER TABLE public.rural_financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rural_property_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rural_property_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation rural goals" ON public.rural_financial_goals;
CREATE POLICY "Tenant isolation rural goals" ON public.rural_financial_goals
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Profile rural favorites" ON public.rural_property_favorites;
CREATE POLICY "Profile rural favorites" ON public.rural_property_favorites
  USING (
    profile_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Profile rural visits" ON public.rural_property_visits;
CREATE POLICY "Profile rural visits" ON public.rural_property_visits
  USING (
    profile_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- ------------------------------------------
-- 20260620_urban_operations_modules.sql
-- ------------------------------------------
-- Urban operations modules: lots, keys, condominiums, documents and portal sync.

CREATE TABLE IF NOT EXISTS public.urban_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  development_id UUID NOT NULL REFERENCES public.developments(id) ON DELETE CASCADE,
  block_name TEXT NOT NULL DEFAULT 'Quadra A',
  lot_number TEXT NOT NULL,
  area_m2 NUMERIC(12,2) DEFAULT 0,
  price NUMERIC(14,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'blocked')),
  buyer_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  reservation_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.key_control (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'checked_out', 'overdue', 'lost')),
  location TEXT,
  responsible_name TEXT,
  checked_out_at TIMESTAMPTZ,
  expected_return_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.condominiums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  units_count INTEGER DEFAULT 0,
  residents_count INTEGER DEFAULT 0,
  delinquent_units INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.condominium_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  condominium_id UUID REFERENCES public.condominiums(id) ON DELETE CASCADE,
  unit_label TEXT,
  category TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.urban_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'signed', 'expired', 'rejected')),
  file_url TEXT,
  file_size TEXT,
  expires_at DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.urban_portal_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  portal_key TEXT NOT NULL,
  portal_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  configured BOOLEAN DEFAULT false,
  feed_url TEXT,
  last_sync_at TIMESTAMPTZ,
  exported_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, portal_key)
);

CREATE TABLE IF NOT EXISTS public.urban_portal_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.urban_portal_integrations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'warning', 'error')),
  message TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.urban_financing_simulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Simulacao financeira',
  property_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  entry_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  installments_count INTEGER NOT NULL DEFAULT 1,
  monthly_interest_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  balloon_payments JSONB NOT NULL DEFAULT '[]'::jsonb,
  monthly_installment NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_financed NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'proposal', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.urban_property_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_urban_lots_org_dev_status ON public.urban_lots (organization_id, development_id, status);
CREATE INDEX IF NOT EXISTS idx_key_control_org_status ON public.key_control (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_condominiums_org ON public.condominiums (organization_id);
CREATE INDEX IF NOT EXISTS idx_condominium_tickets_org_status ON public.condominium_tickets (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_urban_documents_org_status ON public.urban_documents (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_urban_portals_org ON public.urban_portal_integrations (organization_id);
CREATE INDEX IF NOT EXISTS idx_urban_simulations_org_created ON public.urban_financing_simulations (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_urban_favorites_profile ON public.urban_property_favorites (profile_id, created_at DESC);

ALTER TABLE public.urban_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominium_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urban_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urban_portal_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urban_portal_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urban_financing_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urban_property_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation urban_lots" ON public.urban_lots;
CREATE POLICY "Tenant isolation urban_lots" ON public.urban_lots
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation key_control" ON public.key_control;
CREATE POLICY "Tenant isolation key_control" ON public.key_control
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation condominiums" ON public.condominiums;
CREATE POLICY "Tenant isolation condominiums" ON public.condominiums
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation condominium_tickets" ON public.condominium_tickets;
CREATE POLICY "Tenant isolation condominium_tickets" ON public.condominium_tickets
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation urban_documents" ON public.urban_documents;
CREATE POLICY "Tenant isolation urban_documents" ON public.urban_documents
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation urban_portal_integrations" ON public.urban_portal_integrations;
CREATE POLICY "Tenant isolation urban_portal_integrations" ON public.urban_portal_integrations
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation urban_portal_sync_logs" ON public.urban_portal_sync_logs;
CREATE POLICY "Tenant isolation urban_portal_sync_logs" ON public.urban_portal_sync_logs
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation urban_financing_simulations" ON public.urban_financing_simulations;
CREATE POLICY "Tenant isolation urban_financing_simulations" ON public.urban_financing_simulations
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Profile favorites" ON public.urban_property_favorites;
CREATE POLICY "Profile favorites" ON public.urban_property_favorites
  USING (
    profile_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- ------------------------------------------
-- 20260620_whatsmeow_identity_message_hardening.sql
-- ------------------------------------------
-- Whatsmeow identity, receipts and tenant hardening.
-- Additive migration: keeps legacy columns while enabling safer contracts.

BEGIN;

ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS canonical_jid TEXT,
  ADD COLUMN IF NOT EXISTS lid_jid TEXT,
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS manual_name TEXT,
  ADD COLUMN IF NOT EXISTS resolved_display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_bucket TEXT,
  ADD COLUMN IF NOT EXISTS avatar_object_key TEXT,
  ADD COLUMN IF NOT EXISTS avatar_status TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS avatar_refreshed_at TIMESTAMPTZ;

UPDATE public.whatsapp_contacts wc
SET tenant_id = wi.tenant_id,
    phone_e164 = CASE
      WHEN regexp_replace(COALESCE(wc.phone, ''), '\D', '', 'g') LIKE '55%'
       AND length(regexp_replace(COALESCE(wc.phone, ''), '\D', '', 'g')) IN (12, 13)
      THEN '+' || regexp_replace(COALESCE(wc.phone, ''), '\D', '', 'g')
      ELSE wc.phone_e164
    END,
    canonical_jid = CASE
      WHEN regexp_replace(COALESCE(wc.phone, ''), '\D', '', 'g') LIKE '55%'
       AND length(regexp_replace(COALESCE(wc.phone, ''), '\D', '', 'g')) IN (12, 13)
      THEN regexp_replace(COALESCE(wc.phone, ''), '\D', '', 'g') || '@s.whatsapp.net'
      ELSE wc.canonical_jid
    END
FROM public.whatsapp_instances wi
WHERE wi.id = wc.instance_id
  AND wc.tenant_id IS NULL;

UPDATE public.whatsapp_contacts
SET resolved_display_name = CASE
    WHEN COALESCE(manual_name, '') <> '' THEN manual_name
    WHEN COALESCE(display_name, '') <> ''
      AND lower(display_name) NOT IN ('~', 'me', 'contato sem telefone', 'telefone nao identificado', 'telefone não identificado')
      AND display_name NOT ILIKE '%@lid'
      AND display_name NOT LIKE '%--%'
      THEN display_name
    WHEN COALESCE(push_name, '') <> ''
      AND lower(push_name) NOT IN ('~', 'me', 'contato sem telefone')
      AND push_name NOT ILIKE '%@lid'
      AND push_name NOT LIKE '%--%'
      THEN push_name
    WHEN COALESCE(phone_e164, '') <> '' THEN phone_e164
    ELSE 'Contato nao identificado'
  END
WHERE resolved_display_name IS NULL OR resolved_display_name = '';

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant_phone
  ON public.whatsapp_contacts(tenant_id, phone);

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant_phone_e164
  ON public.whatsapp_contacts(tenant_id, phone_e164)
  WHERE phone_e164 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_instance_canonical_jid
  ON public.whatsapp_contacts(instance_id, canonical_jid)
  WHERE canonical_jid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_instance_lid
  ON public.whatsapp_contacts(instance_id, lid_jid)
  WHERE lid_jid IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.whatsapp_message_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  whatsapp_message_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read', 'played', 'failed')),
  participant_jid TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_message_status_unique
  ON public.whatsapp_message_status(instance_id, whatsapp_message_id, status, COALESCE(participant_jid, ''));

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_status_tenant_time
  ON public.whatsapp_message_status(tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_status_message
  ON public.whatsapp_message_status(message_id, occurred_at DESC);

ALTER TABLE public.whatsapp_message_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on whatsapp message status" ON public.whatsapp_message_status;
CREATE POLICY "Service role full access on whatsapp message status"
  ON public.whatsapp_message_status
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation whatsapp message status" ON public.whatsapp_message_status;
CREATE POLICY "Tenant isolation whatsapp message status"
  ON public.whatsapp_message_status
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT,
  ADD COLUMN IF NOT EXISTS phone_search_key TEXT;

UPDATE public.leads
SET phone_e164 = CASE
    WHEN regexp_replace(COALESCE(phone, ''), '\D', '', 'g') LIKE '55%'
     AND length(regexp_replace(COALESCE(phone, ''), '\D', '', 'g')) IN (12, 13)
    THEN '+' || regexp_replace(COALESCE(phone, ''), '\D', '', 'g')
    ELSE phone_e164
  END,
  phone_search_key = right(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 8)
WHERE phone IS NOT NULL
  AND (phone_e164 IS NULL OR phone_search_key IS NULL);

CREATE INDEX IF NOT EXISTS idx_leads_org_phone_e164
  ON public.leads(organization_id, phone_e164)
  WHERE phone_e164 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_org_phone_search_key
  ON public.leads(organization_id, phone_search_key)
  WHERE phone_search_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_media_tenant_bucket_object
  ON public.whatsapp_media(tenant_id, bucket, object_key)
  WHERE object_key <> '';

COMMIT;

-- ------------------------------------------
-- 20260630_whatsapp_media_recovery_hardening.sql
-- ------------------------------------------
-- WhatsApp media recovery hardening.
-- Old history imports could leave media rows pending without object data and
-- without the original WhatsApp payload required for the async worker retry.

BEGIN;

WITH orphan_media AS (
  UPDATE public.whatsapp_media
  SET status = 'failed',
      last_error = 'Midia sem payload de recuperacao. Reimporte a conversa para recriar o job de download.',
      next_retry_at = now(),
      claimed_at = NULL,
      updated_at = now()
  WHERE status IN ('pending', 'downloading', 'processing')
    AND COALESCE(object_key, '') = ''
    AND COALESCE(public_url, '') = ''
    AND whatsapp_payload IS NULL
  RETURNING message_id, last_error, retry_count
)
UPDATE public.whatsapp_messages m
SET media_status = 'failed',
    media_error = orphan_media.last_error,
    media_retry_count = orphan_media.retry_count
FROM orphan_media
WHERE m.id = orphan_media.message_id;

CREATE INDEX IF NOT EXISTS idx_whatsapp_media_recoverable_payload
  ON public.whatsapp_media(status, next_retry_at, retry_count)
  WHERE whatsapp_payload IS NOT NULL;

COMMIT;

-- ------------------------------------------
-- 20260705_add_organizations_feature_flags.sql
-- ------------------------------------------
-- Add tenant-level feature flags used by the superadmin feature flag panel.
-- This migration is intentionally narrow and idempotent.

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organizations.feature_flags
IS 'Per-organization feature toggles managed by the superadmin panel.';

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------
-- 20260705_organizations_superadmin_rls.sql
-- ------------------------------------------
-- Allow superadmins to manage organizations via authenticated JWT (admin panel fallback)
-- and let tenant users read their own organization row.

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin full access organizations" ON public.organizations;
CREATE POLICY "Superadmin full access organizations" ON public.organizations
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Users read own organization" ON public.organizations;
CREATE POLICY "Users read own organization" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.get_my_org_id());

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------
-- 20260713_global_templates.sql
-- ------------------------------------------
-- Create global_templates table for system-wide template management
-- Run this migration in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS global_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('landing_page', 'email', 'contract', 'report')),
  category TEXT NOT NULL DEFAULT 'Geral',
  description TEXT DEFAULT '',
  preview TEXT DEFAULT '📄',
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_global_templates_org ON global_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_global_templates_type ON global_templates(type);
CREATE INDEX IF NOT EXISTS idx_global_templates_category ON global_templates(category);

-- RLS policies
ALTER TABLE global_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage global templates"
  ON global_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
        AND profiles.organization_id = global_templates.organization_id
    )
  );

CREATE POLICY "Authenticated users can read global templates"
  ON global_templates
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ------------------------------------------
-- 20260724_incorporation_modules.sql
-- ------------------------------------------
-- Incorporation modules: Availability maps, Reservations, Financial Transfers, Post-Obra, NPS

CREATE TABLE IF NOT EXISTS public.availability_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  development_id UUID REFERENCES public.developments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  svg_url TEXT,
  config_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.unit_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.urban_lots(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  bank_name TEXT NOT NULL,
  total_amount NUMERIC(14,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'analysis' CHECK (status IN ('analysis', 'engineering', 'contract', 'released', 'rejected')),
  expected_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_obra_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'inspection', 'repairing', 'done', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nps_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nps_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.nps_campaigns(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 0 AND score <= 10),
  feedback TEXT,
  responded_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_availability_maps_org ON public.availability_maps(organization_id);
CREATE INDEX IF NOT EXISTS idx_unit_reservations_org ON public.unit_reservations(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_transfers_org ON public.financial_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_pos_obra_tickets_org ON public.pos_obra_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_nps_campaigns_org ON public.nps_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_nps_responses_org ON public.nps_responses(organization_id);

-- RLS
ALTER TABLE public.availability_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_obra_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nps_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tenant isolation availability_maps" ON public.availability_maps USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant isolation unit_reservations" ON public.unit_reservations USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant isolation financial_transfers" ON public.financial_transfers USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant isolation pos_obra_tickets" ON public.pos_obra_tickets USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant isolation nps_campaigns" ON public.nps_campaigns USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant isolation nps_responses" ON public.nps_responses USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- ------------------------------------------
-- v2_multi_panel.sql
-- ------------------------------------------
-- ============================================================
-- IMOBZY Multi-Panel Architecture — Database Migration v2.0
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add niche column to organizations (if not exists)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS niche TEXT DEFAULT 'traditional';

-- 2. Add feature_flags column for plan-based feature toggling
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}'::jsonb;

-- 3. Expand RBAC roles (add 'gerente' and 'assistente')
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('superadmin', 'admin', 'gerente', 'broker', 'assistente', 'user'));

-- 4. Create audit_log table for global change tracking
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create developments table (Urban Empreendimentos)
CREATE TABLE IF NOT EXISTS developments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  total_units INT DEFAULT 0,
  available_units INT DEFAULT 0,
  status TEXT DEFAULT 'em_obras' CHECK (status IN ('em_obras', 'lancamento', 'pronto', 'esgotado')),
  progress_pct INT DEFAULT 0,
  price_table JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create rental_contracts table (Urban Locação)
CREATE TABLE IF NOT EXISTS rental_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  tenant_name TEXT NOT NULL,
  tenant_email TEXT,
  tenant_phone TEXT,
  start_date DATE,
  end_date DATE,
  monthly_rent NUMERIC(12,2),
  adjustment_index TEXT DEFAULT 'IGPM',
  payment_status TEXT DEFAULT 'em_dia' CHECK (payment_status IN ('em_dia', 'atrasado', 'inadimplente')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Enable RLS on new tables
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE developments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant isolation audit_log" ON audit_log
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation developments" ON developments
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation rental_contracts" ON rental_contracts
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Done!
SELECT 'Migration v2.0 completed successfully!' AS result;

-- ------------------------------------------
-- v3_support_governance.sql
-- ------------------------------------------
-- ============================================================
-- IMOBZY: Support Tickets System
-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard)
-- ============================================================

-- 1. Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES profiles(id),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create support_messages table (replies)
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS for support_tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own organization tickets" ON support_tickets;
CREATE POLICY "Users can view their own organization tickets" 
ON support_tickets FOR SELECT 
TO authenticated 
USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create tickets for their organization" ON support_tickets;
CREATE POLICY "Users can create tickets for their organization" 
ON support_tickets FOR INSERT 
TO authenticated 
WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "SuperAdmins can view all tickets" ON support_tickets;
CREATE POLICY "SuperAdmins can view all tickets" 
ON support_tickets FOR SELECT 
TO authenticated 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

DROP POLICY IF EXISTS "SuperAdmins can update all tickets" ON support_tickets;
CREATE POLICY "SuperAdmins can update all tickets" 
ON support_tickets FOR UPDATE
TO authenticated 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

-- 4. RLS for support_messages
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages for their tickets" ON support_messages;
CREATE POLICY "Users can view messages for their tickets" 
ON support_messages FOR SELECT 
TO authenticated 
USING (EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE id = support_messages.ticket_id 
    AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
));

DROP POLICY IF EXISTS "Users can insert messages for their tickets" ON support_messages;
CREATE POLICY "Users can insert messages for their tickets" 
ON support_messages FOR INSERT 
TO authenticated 
WITH CHECK (EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE id = support_messages.ticket_id 
    AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
));

DROP POLICY IF EXISTS "SuperAdmins can view all messages" ON support_messages;
CREATE POLICY "SuperAdmins can view all messages" 
ON support_messages FOR SELECT 
TO authenticated 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

DROP POLICY IF EXISTS "SuperAdmins can insert all messages" ON support_messages;
CREATE POLICY "SuperAdmins can insert all messages" 
ON support_messages FOR INSERT 
TO authenticated 
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

-- ------------------------------------------
-- v4_locacao_extendida.sql
-- ------------------------------------------
-- Migration v4: Extensão de Locação
-- Tabelas para gestão de cobranças, boletos, histórico de pagamentos e renovações

-- 1. Tabela de histórico de pagamentos
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES rental_contracts(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  payment_date DATE,
  due_date DATE,
  amount_paid NUMERIC(12,2),
  amount_due NUMERIC(12,2),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  payment_method TEXT,
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de renovações de contratos
CREATE TABLE IF NOT EXISTS contract_renewals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES rental_contracts(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  old_rent NUMERIC(12,2),
  new_rent NUMERIC(12,2),
  old_end_date DATE,
  new_start_date DATE,
  new_end_date DATE,
  adjustment_index TEXT,
  renewal_type TEXT DEFAULT 'reajuste' CHECK (renewal_type IN ('reajuste', 'renovacao', 'novo_contrato')),
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de boletos/cobranças
CREATE TABLE IF NOT EXISTS billing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES rental_contracts(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  amount NUMERIC(12,2),
  status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'vencido', 'cancelado', 'protesto')),
  payment_date DATE,
  barcode TEXT,
  nossonumero TEXT,
  invoice_url TEXT,
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Adicionar colunas extras na tabela de contratos (se não existirem)
DO $$ 
BEGIN
  -- Check if column exists before adding
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_cpf') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_cpf TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_rg') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_rg TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantee_type') THEN
    ALTER TABLE rental_contracts ADD COLUMN guarantee_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantee_document') THEN
    ALTER TABLE rental_contracts ADD COLUMN guarantee_document TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'observation') THEN
    ALTER TABLE rental_contracts ADD COLUMN observation TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_birth_date') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_birth_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_marital_status') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_marital_status TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_profession') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_profession TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_employer') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_employer TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_monthly_income') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_monthly_income NUMERIC(12,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_address') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_address TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_city') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_city TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_state') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_state TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_zip') THEN
    ALTER TABLE rental_contracts ADD COLUMN tenant_zip TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'emergency_contact_name') THEN
    ALTER TABLE rental_contracts ADD COLUMN emergency_contact_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'emergency_contact_phone') THEN
    ALTER TABLE rental_contracts ADD COLUMN emergency_contact_phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'reference_1_name') THEN
    ALTER TABLE rental_contracts ADD COLUMN reference_1_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'reference_1_phone') THEN
    ALTER TABLE rental_contracts ADD COLUMN reference_1_phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'reference_2_name') THEN
    ALTER TABLE rental_contracts ADD COLUMN reference_2_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'reference_2_phone') THEN
    ALTER TABLE rental_contracts ADD COLUMN reference_2_phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'evaluation_score') THEN
    ALTER TABLE rental_contracts ADD COLUMN evaluation_score INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'evaluation_status') THEN
    ALTER TABLE rental_contracts ADD COLUMN evaluation_status TEXT DEFAULT 'em_analise';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'credit_score') THEN
    ALTER TABLE rental_contracts ADD COLUMN credit_score INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'has_restrictions') THEN
    ALTER TABLE rental_contracts ADD COLUMN has_restrictions BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'restriction_notes') THEN
    ALTER TABLE rental_contracts ADD COLUMN restriction_notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'income_proof_status') THEN
    ALTER TABLE rental_contracts ADD COLUMN income_proof_status TEXT DEFAULT 'pendente';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantor_name') THEN
    ALTER TABLE rental_contracts ADD COLUMN guarantor_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantor_cpf') THEN
    ALTER TABLE rental_contracts ADD COLUMN guarantor_cpf TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantor_phone') THEN
    ALTER TABLE rental_contracts ADD COLUMN guarantor_phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantor_monthly_income') THEN
    ALTER TABLE rental_contracts ADD COLUMN guarantor_monthly_income NUMERIC(12,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'recommended_limit') THEN
    ALTER TABLE rental_contracts ADD COLUMN recommended_limit NUMERIC(12,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'analysis_notes') THEN
    ALTER TABLE rental_contracts ADD COLUMN analysis_notes TEXT;
  END IF;
END $$;

-- 5. Enable RLS on new tables
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "Tenant isolation payment_history" ON payment_history;
CREATE POLICY "Tenant isolation payment_history" ON payment_history
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation contract_renewals" ON contract_renewals;
CREATE POLICY "Tenant isolation contract_renewals" ON contract_renewals
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation billing" ON billing;
CREATE POLICY "Tenant isolation billing" ON billing
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Done!
SELECT 'Migration v4 (Locação Estendida) completed successfully!' AS result;

-- ------------------------------------------
-- v6_rural_search_logs.sql
-- ------------------------------------------
-- migrations/v6_rural_search_logs.sql

CREATE TABLE IF NOT EXISTS rural_location_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  organization_id UUID,
  google_maps_url TEXT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  uf TEXT NULL,
  municipality TEXT NULL,
  source_endpoint TEXT DEFAULT 'https://geoserver.car.gov.br/geoserver/sicar/ows',
  source_layer TEXT NULL,
  match_mode TEXT NULL, -- 'contains_point', 'nearby_radius', 'none'
  confidence TEXT NULL,   -- 'alta', 'media', 'baixa', 'nenhuma'
  total_matches INTEGER DEFAULT 0,
  request_payload JSONB,
  response_summary JSONB,
  error_message TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance e auditoria
CREATE INDEX IF NOT EXISTS idx_rural_search_org ON rural_location_search_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_rural_search_user ON rural_location_search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_rural_search_created ON rural_location_search_logs(created_at);

-- ------------------------------------------
-- v7_urbano_fase1_cadastros.sql
-- ------------------------------------------
-- Migration v7: Imobzy Urbano Fase 1 - Cadastros Gerais e Modalidades
-- Criação da tabela unificada de clientes (CRM avançado) e adaptação de campos

-- 1. Criação da Tabela de Clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('CPF', 'CNPJ', 'Passaporte')),
  document_number TEXT,
  email TEXT,
  phone TEXT,
  -- 'Comprador', 'Inquilino', 'Proprietário', 'Fiador', 'Investidor'
  roles TEXT[] DEFAULT '{}', 
  
  -- Dados Pessoais / Profissionais
  birth_date DATE,
  marital_status TEXT,
  profession TEXT,
  monthly_income NUMERIC(12,2),
  
  -- Endereço com base no CEP
  address_zip TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Atualizar tabela de properties para associar a um proprietário
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'owner_id') THEN
    ALTER TABLE properties ADD COLUMN owner_id UUID REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Atualizar tabela de leads para poder linkar com um cliente existente (caso já exista)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'client_id') THEN
    ALTER TABLE leads ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Enable RLS e Policies para Clientes
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation clients" ON clients;
CREATE POLICY "Tenant isolation clients" ON clients
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Done!
SELECT 'Migration v7 (Urbano Fase 1 - Cadastros) completed successfully!' AS result;

-- ------------------------------------------
-- v8_fix_bi_rpcs_and_views.sql
-- ------------------------------------------
-- ============================================================
-- Migration v8: Fix RPCs de BI + Views de compatibilidade
-- Corrige: get_bi_stats, get_bi_lead_sources (404)
--           billing -> billings (alias), contracts -> view
-- ============================================================

-- 1. RPC get_bi_stats (retorna estatísticas gerais do portfólio)
CREATE OR REPLACE FUNCTION get_bi_stats(org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_value',     COALESCE(SUM(price), 0),
        'property_count',  COUNT(*),
        'total_area_ha',   COALESCE(SUM((features->>'areaHectares')::numeric), 0),
        'avg_ha_price', CASE
            WHEN COALESCE(SUM((features->>'areaHectares')::numeric), 0) > 0
            THEN COALESCE(SUM(price), 0) / SUM((features->>'areaHectares')::numeric)
            ELSE 0
        END
    ) INTO result
    FROM properties
    WHERE organization_id = org_id;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 2. RPC get_bi_lead_sources (retorna contagem de leads por canal)
CREATE OR REPLACE FUNCTION get_bi_lead_sources(org_id UUID)
RETURNS TABLE (name TEXT, value BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(source, 'Outros') AS name,
        COUNT(*)::BIGINT           AS value
    FROM leads
    WHERE organization_id = org_id
    GROUP BY source
    ORDER BY value DESC;
END;
$$;

-- 3. View "billings" como alias de "billing" (evita 400 Bad Request)
--    O frontend chama /rest/v1/billings mas a tabela real é "billing"
CREATE OR REPLACE VIEW billings AS
    SELECT
        b.*,
        rc.tenant_name,
        rc.property_id
    FROM billing b
    LEFT JOIN rental_contracts rc ON rc.id = b.contract_id;

-- 4. View "contracts" como alias de "rental_contracts" com campos esperados
--    O frontend chama /rest/v1/contracts?status=eq.Active
CREATE OR REPLACE VIEW contracts AS
    SELECT
        id,
        organization_id,
        tenant_name,
        property_id,
        monthly_rent  AS value,
        status,
        start_date,
        end_date,
        created_at
    FROM rental_contracts;

-- 5. Garantir permissões nas views
GRANT SELECT ON billings TO authenticated;
GRANT SELECT ON contracts TO authenticated;

SELECT 'Migration v8 (Fix BI RPCs + Views billings/contracts) completed!' AS result;

-- ------------------------------------------
-- whatsapp_schema.sql
-- ------------------------------------------
-- ============================================
-- WhatsApp System Schema Migration
-- Sistema de Atendimento WhatsApp Multi-Instância
-- ============================================

-- Tabela de Instâncias WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting', 'qr_pending')),
    qr_code TEXT,
    phone VARCHAR(20),
    jid VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Contatos WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    push_name VARCHAR(255),
    display_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(instance_id, phone)
);

-- Tabela de Chats (conversas individuais e grupos)
CREATE TABLE IF NOT EXISTS whatsapp_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
    chat_jid VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT '',
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    unread_count INTEGER NOT NULL DEFAULT 0,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(instance_id, chat_jid)
);

-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
    chat_id UUID NOT NULL REFERENCES whatsapp_chats(id) ON DELETE CASCADE,
    message_id VARCHAR(255) NOT NULL,
    sender_phone VARCHAR(20) NOT NULL,
    sender_name VARCHAR(255) NOT NULL DEFAULT '',
    is_from_me BOOLEAN NOT NULL DEFAULT FALSE,
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contact', 'unknown')),
    content TEXT,
    media_url TEXT,
    media_mimetype VARCHAR(100),
    media_filename VARCHAR(255),
    quoted_message_id VARCHAR(255),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(instance_id, message_id)
);

-- ============================================
-- Indexes para performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_tenant ON whatsapp_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_instance ON whatsapp_contacts(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON whatsapp_contacts(phone);

CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_instance ON whatsapp_chats(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_jid ON whatsapp_chats(chat_jid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_last_msg ON whatsapp_chats(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat ON whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance ON whatsapp_messages(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sender ON whatsapp_messages(sender_phone);

-- ============================================
-- RLS (Row Level Security) — para Supabase
-- ============================================

ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Políticas: Service Role tem acesso total (usado pelo backend Go)
CREATE POLICY "Service role full access on instances" ON whatsapp_instances
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on contacts" ON whatsapp_contacts
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on chats" ON whatsapp_chats
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on messages" ON whatsapp_messages
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Trigger para updated_at automático
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_instances_updated_at
    BEFORE UPDATE ON whatsapp_instances
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_whatsapp_contacts_updated_at
    BEFORE UPDATE ON whatsapp_contacts
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_whatsapp_chats_updated_at
    BEFORE UPDATE ON whatsapp_chats
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Storage Bucket para mídias
-- ============================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- NEW: WHITELABEL B2B2B SCHEMAS
-- ==========================================
-- ============================================
-- SAAS WHITELABEL B2B2B EVOLUTION
-- ============================================

-- 1. Add fields to Organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_reseller BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES organizations(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS platform_domain TEXT UNIQUE;

-- 2. Add fields to Site Settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS smtp_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS onboarding_config JSONB DEFAULT '{}'::jsonb;

-- 3. Update RLS on Organizations (Example: Reseller can see their sub-organizations)
-- This assumes RLS is enabled on organizations. 
-- We'll add a policy so that if user is in an organization that is a reseller, they can see organizations where parent_id = their_organization_id
-- We need to check if there is an existing policy. For safety, we just CREATE POLICY, which might fail if it already exists, so we use a DO block.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'Reseller can see sub-organizations'
    ) THEN
        CREATE POLICY "Reseller can see sub-organizations"
        ON organizations
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM profiles p 
                JOIN organizations o ON p.organization_id = o.id 
                WHERE p.id = auth.uid() AND o.is_reseller = true AND organizations.parent_id = o.id
            )
        );
    END IF;
END $$;

-- ==========================================
-- NEW: WHITELABEL RLS POLICIES
-- ==========================================
-- Enable Reseller (Revenda) to view their sub-organizations
DROP POLICY IF EXISTS "Reseller view sub-organizations" ON public.organizations;
CREATE POLICY "Reseller view sub-organizations" ON public.organizations
  FOR SELECT
  USING (
    parent_id = (
      SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1
    )
  );

-- Enable Reseller to manage (update) their sub-organizations
DROP POLICY IF EXISTS "Reseller update sub-organizations" ON public.organizations;
CREATE POLICY "Reseller update sub-organizations" ON public.organizations
  FOR UPDATE
  USING (
    parent_id = (
      SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1
    )
  );

-- Enable Reseller to insert new sub-organizations
DROP POLICY IF EXISTS "Reseller insert sub-organizations" ON public.organizations;
CREATE POLICY "Reseller insert sub-organizations" ON public.organizations
  FOR INSERT
  WITH CHECK (
    parent_id = (
      SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1
    )
  );

-- Enable Reseller to view users belonging to their sub-organizations
DROP POLICY IF EXISTS "Reseller view sub-organization users" ON public.users;
CREATE POLICY "Reseller view sub-organization users" ON public.users
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations 
      WHERE parent_id = (
        SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1
      )
    )
  );

-- Enable Reseller to view site_settings of their sub-organizations
DROP POLICY IF EXISTS "Reseller view sub-organization settings" ON public.site_settings;
CREATE POLICY "Reseller view sub-organization settings" ON public.site_settings
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations 
      WHERE parent_id = (
        SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1
      )
    )
  );


-- ==========================================
-- FOREIGN KEYS (ADDED AT THE END TO AVOID DEPENDENCY ISSUES)
-- ==========================================

