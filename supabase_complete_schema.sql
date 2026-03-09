-- ========================================================================================
-- IMOBZY RURAL PLATFORM - COMPLETE DATABASE SCHEMA (v1.0)
-- Objective: Multi-tenant Rural SaaS (Farm sales, cattle, agriculture, GIS, CRM, WhatsApp)
-- ========================================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ORGANIZATIONS (Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- Internal slug and default subdomain
    subdomain TEXT UNIQUE,      -- For client.imobzy.com.br
    custom_domain TEXT UNIQUE, -- For www.client.com.br
    domain_verified BOOLEAN DEFAULT false,
    logo_url TEXT,
    logo_height INTEGER DEFAULT 40,
    primary_color TEXT DEFAULT '#064e3b',
    secondary_color TEXT DEFAULT '#d4af37',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'pending')),
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PROFILES (Users)
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

-- 4. CUSTOM DOMAINS (New management system)
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    is_custom BOOLEAN DEFAULT false,
    is_primary BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'pending', -- pending, verified, active, failed
    verified_at TIMESTAMP WITH TIME ZONE,
    dns_records JSONB DEFAULT '[]'::jsonb,
    ssl_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. RURAL PROPERTIES
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    broker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Commercial Info
    title TEXT NOT NULL,
    description TEXT,
    description_draft TEXT,
    price NUMERIC(20,2),
    currency TEXT DEFAULT 'BRL',
    status TEXT DEFAULT 'Disponível' CHECK (status IN ('Disponível', 'Alugado', 'Vendido', 'Reservado', 'Pendente', 'Inativo')),
    purpose TEXT DEFAULT 'Venda' CHECK (purpose IN ('Venda', 'Aluguel', 'Venda e Aluguel')),
    property_type TEXT DEFAULT 'Fazenda', -- FAZENDA, SITIO, CHACARA, HARAS, AREA_AGRICOLA, etc
    
    -- Precise Rural Area (Hectares)
    total_area_ha NUMERIC(15,2) DEFAULT 0,
    useful_area_ha NUMERIC(15,2) DEFAULT 0,
    open_area_ha NUMERIC(15,2) DEFAULT 0,
    agricultural_area_ha NUMERIC(15,2) DEFAULT 0,
    pasture_area_ha NUMERIC(15,2) DEFAULT 0,
    reserve_legal_ha NUMERIC(15,2) DEFAULT 0,
    app_ha NUMERIC(15,2) DEFAULT 0,
    
    -- Geographic
    city TEXT,
    neighborhood TEXT,
    state TEXT,
    region TEXT,
    address TEXT,
    centroid GEOGRAPHY(POINT, 4326),
    
    -- Technical Rural Fields
    aptitude TEXT[],    -- ['Agricultura', 'Pecuária', 'Mista']
    biome TEXT,         -- AMAZÔNIA, CERRADO, CAATINGA, PANTANAL, etc
    topography TEXT,    -- PLANA, ONDULADA, etc
    soil_texture TEXT,  -- ARGILOSO, ARENOSO, etc
    altitude NUMERIC(10,2),
    pluviometry NUMERIC(10,2),
    
    -- Extended Features (JSONB for complex nested structure in types.ts)
    features JSONB DEFAULT '{}'::jsonb,
    
    -- Media
    images TEXT[] DEFAULT '{}',
    video_url TEXT,
    
    -- Metadata
    highlighted BOOLEAN DEFAULT false,
    is_confidential BOOLEAN DEFAULT false,
    is_exclusive BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PROPERTY POLYGONS (GIS parcels)
CREATE TABLE IF NOT EXISTS property_polygons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    geom GEOMETRY(GEOMETRY, 4326),
    source TEXT, -- MANUAL, CAR, SIGEF, KML
    area_calculated_ha NUMERIC(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. LEADS (CRM)
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
    
    -- Rural interest
    budget NUMERIC(20,2),
    aptitude_interest TEXT[],
    preferences JSONB DEFAULT '{}'::jsonb,
    
    -- Tracking (UTM)
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    referrer_url TEXT,
    landing_page_url TEXT,
    client_id TEXT, -- Google Client ID
    fbp TEXT, -- FB Pixel
    fbc TEXT, -- FB Click ID
    session_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. SITE SETTINGS & TEXTS
CREATE TABLE IF NOT EXISTS site_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    template_id TEXT DEFAULT 'modern',
    layout_config JSONB DEFAULT '{}'::jsonb, -- Store Visual Editor blocks
    integrations JSONB DEFAULT '{}'::jsonb, -- Evolution API, Groq, etc.
    custom_css TEXT,
    custom_js TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_texts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    key TEXT NOT NULL,              -- Chave (hero.title)
    value TEXT NOT NULL,            -- Valor customizado
    section TEXT,                   -- hero, about, etc
    default_value TEXT NOT NULL,    -- Fallback
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, key)
);

-- 9. WHATSAPP / EVOLUTION API INTEGRATION
CREATE TABLE IF NOT EXISTS instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'close', -- open, close, connecting
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
    remote_jid TEXT NOT NULL,
    push_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, remote_jid)
);

-- 10. INDICES
CREATE INDEX idx_props_geo ON properties USING GIST (centroid);
CREATE INDEX idx_poly_geo ON property_polygons USING GIST (geom);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_site_texts_key ON site_texts(key);

-- 11. AUTOMATION TRIGGERS (Subdomains & Domains)
CREATE OR REPLACE FUNCTION set_organization_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL THEN
        NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '', 'g'));
    END IF;
    NEW.subdomain := NEW.slug;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_org_slug
BEFORE INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION set_organization_slug();

CREATE OR REPLACE FUNCTION create_initial_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO site_settings (organization_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_org_settings
AFTER INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION create_initial_settings();

-- 12. ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are visible to everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizations public view" ON organizations FOR SELECT USING (true);
CREATE POLICY "Admins can update their organization" ON organizations FOR UPDATE 
USING (id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- Tenant Isolation for other tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name IN ('properties', 'leads', 'property_polygons', 'site_settings', 'site_texts', 'instances', 'contacts')
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation %I" ON %I', t, t);
        EXECUTE format('CREATE POLICY "Tenant isolation %I" ON %I USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))', t, t);
        
        -- Special policy for public views (properties, settings, texts)
        IF t IN ('properties', 'site_settings', 'site_texts') THEN
            EXECUTE format('CREATE POLICY "Public view %I" ON %I FOR SELECT TO public USING (true)', t, t);
        END IF;
        
        -- Special policy for public inserts (Leads from form)
        IF t = 'leads' THEN
            EXECUTE format('CREATE POLICY "Public insert leads" ON leads FOR INSERT TO public WITH CHECK (true)');
        END IF;
    END LOOP;
END;
$$;

-- 13. RPC FUNCTIONS (Domain & Search)

-- Resolve tenant by domain (Internal or Custom)
CREATE OR REPLACE FUNCTION get_tenant_by_domain(domain_to_check TEXT)
RETURNS TABLE(id UUID, name TEXT, slug TEXT, primary_color TEXT, secondary_color TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.name, o.slug, o.primary_color, o.secondary_color
  FROM organizations o
  WHERE o.subdomain = domain_to_check 
     OR o.custom_domain = domain_to_check 
     OR o.slug = domain_to_check
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple search function
CREATE OR REPLACE FUNCTION search_properties(query_text TEXT, min_price NUMERIC, max_price NUMERIC)
RETURNS SETOF properties AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM properties
  WHERE (title ILIKE '%' || query_text || '%' OR description ILIKE '%' || query_text || '%')
    AND (price >= min_price OR min_price IS NULL)
    AND (price <= max_price OR max_price IS NULL);
END;
$$ LANGUAGE plpgsql;

-- 14. SUPERADMIN AUTO-ASSIGN (First user becomes superadmin)
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
    new.raw_user_meta_data->>'name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
