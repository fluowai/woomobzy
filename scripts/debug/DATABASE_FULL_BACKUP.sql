-- ========================================================================================
-- IMOBZY - FULL DATABASE SETUP (PRODUCTION READY)
-- Versão: 2.1.0 (Com Seguranca Hardened)
-- ========================================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELAS DE INFRAESTRUTURA E TENANCY
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

-- 3. PROPRIEDADES E GIS
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    description_draft TEXT,
    price NUMERIC(20,2),
    currency TEXT DEFAULT 'BRL',
    status TEXT DEFAULT 'Disponível' CHECK (status IN ('Disponível', 'Alugado', 'Vendido', 'Reservado', 'Pendente', 'Inativo')),
    purpose TEXT DEFAULT 'Venda' CHECK (purpose IN ('Venda', 'Aluguel', 'Venda e Aluguel')),
    property_type TEXT DEFAULT 'Fazenda',
    total_area_ha NUMERIC(15,2) DEFAULT 0,
    useful_area_ha NUMERIC(15,2) DEFAULT 0,
    open_area_ha NUMERIC(15,2) DEFAULT 0,
    agricultural_area_ha NUMERIC(15,2) DEFAULT 0,
    pasture_area_ha NUMERIC(15,2) DEFAULT 0,
    reserve_legal_ha NUMERIC(15,2) DEFAULT 0,
    app_ha NUMERIC(15,2) DEFAULT 0,
    city TEXT,
    neighborhood TEXT,
    state TEXT,
    region TEXT,
    address TEXT,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    aptitude TEXT[],
    biome TEXT,
    topography TEXT,
    soil_texture TEXT,
    altitude NUMERIC(10,2),
    pluviometry NUMERIC(10,2),
    features JSONB DEFAULT '{}'::jsonb,
    images TEXT[] DEFAULT '{}',
    video_url TEXT,
    highlighted BOOLEAN DEFAULT false,
    is_confidential BOOLEAN DEFAULT false,
    is_exclusive BOOLEAN DEFAULT false,
    owner_info JSONB DEFAULT '{}'::jsonb,
    analysis JSONB DEFAULT '{}'::jsonb,
    layout_config JSONB DEFAULT '{}'::jsonb,
    search_vector TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_polygons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    geom_data TEXT,
    source TEXT,
    area_calculated_ha NUMERIC(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS due_diligence_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- CAR, ITR, CCIR, MATRICULA
  status TEXT DEFAULT 'PENDING',
  document_url TEXT,
  observations TEXT,
  expiry_date DATE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CRM E LEADS
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
    budget NUMERIC(20,2),
    aptitude_interest TEXT[],
    preferences JSONB DEFAULT '{}'::jsonb,
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

-- 5. CONFIGURAÇÕES E VISUAL EDITOR
CREATE TABLE IF NOT EXISTS site_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    template_id TEXT DEFAULT 'modern',
    agency_name TEXT,
    primary_color TEXT DEFAULT '#064e3b',
    secondary_color TEXT DEFAULT '#d4af37',
    header_color TEXT,
    logo_url TEXT,
    logo_height INTEGER DEFAULT 40,
    font_family TEXT DEFAULT 'Inter, sans-serif',
    contact_email TEXT,
    contact_phone TEXT,
    contact_whatsapp TEXT,
    footer_text TEXT,
    social_links JSONB DEFAULT '{"instagram": "","facebook": "","whatsapp": ""}'::jsonb,
    home_content JSONB DEFAULT '{}'::jsonb,
    layout_config JSONB DEFAULT '{}'::jsonb,
    integrations JSONB DEFAULT '{}'::jsonb,
    custom_css TEXT,
    custom_js TEXT,
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

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

-- 6. WHATSAPP (BAILEYS)
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

-- 7. CONTRATOS, PLANOS E AUDITORIA
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

CREATE TABLE IF NOT EXISTS saas_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    global_openai_key TEXT,
    global_gemini_key TEXT,
    maintenance_mode BOOLEAN DEFAULT false,
    default_plan_id UUID REFERENCES plans(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

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

-- 8. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_properties_org ON properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_org ON whatsapp_instances(organization_id);

-- 9. FUNÇÕES E SEGURANÇA (RLS)
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ativar RLS em tabelas criticas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Políticas Base (Isolamento de Tenant)
CREATE POLICY "Tenant isolation properties" ON properties FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "Tenant isolation leads" ON leads FOR ALL USING (organization_id = get_user_org_id());
CREATE POLICY "Public properties select" ON properties FOR SELECT TO anon USING (status = 'Disponível');

-- 10. TRIGGERS
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM profiles) INTO is_first;
  INSERT INTO public.profiles (id, email, role, name)
  VALUES (new.id, new.email, CASE WHEN is_first THEN 'superadmin' ELSE 'broker' END, COALESCE(new.raw_user_meta_data->>'name', new.email));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 11. RPC (INCLUINDO FIX DE SEGURANÇA)
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  EXECUTE sql;
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- RESTRIÇÃO DE SEGURANÇA
REVOKE EXECUTE ON FUNCTION exec_sql(TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION exec_sql(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION exec_sql(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION get_tenant_by_domain(domain_to_check TEXT)
RETURNS TABLE(id UUID, name TEXT, slug TEXT, primary_color TEXT, secondary_color TEXT, niche TEXT) AS $$
BEGIN
  RETURN QUERY SELECT o.id, o.name, o.slug, o.primary_color, o.secondary_color, o.niche FROM organizations o
  WHERE o.subdomain = domain_to_check OR o.custom_domain = domain_to_check OR o.slug = domain_to_check LIMIT 1;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. DADOS INICIAIS (SEED)
INSERT INTO plans (name, price_monthly, features) VALUES ('Free', 0, '{"properties": 5, "leads": 20}') ON CONFLICT DO NOTHING;
INSERT INTO saas_settings (id, maintenance_mode) VALUES (1, false) ON CONFLICT DO NOTHING;
