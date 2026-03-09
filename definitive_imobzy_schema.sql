-- ============================================
-- IMOBZY RURAL PLATFORM - DEFINITIVE SCHEMA
-- ============================================
-- Includes: Multi-tenancy, Rural technical fields, GIS/PostGIS, 
-- CRM, Visual Editor support and WhatsApp integration.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ORGANIZATIONS (Tenants)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subdomain TEXT UNIQUE,
  custom_domain TEXT UNIQUE,
  logo_url TEXT,
  status TEXT DEFAULT 'active',
  plan_id UUID, -- Link to plans table
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PROFILES (Users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('superadmin', 'admin', 'broker', 'user')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RURAL PROPERTIES (Unified Registry)
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  broker_id UUID REFERENCES profiles(id),
  
  -- Commercial Info
  title TEXT NOT NULL,
  description TEXT,
  description_draft TEXT,
  price NUMERIC(20,2),
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'Disponível',
  purpose TEXT DEFAULT 'Venda',
  
  -- Location
  city TEXT,
  neighborhood TEXT,
  state TEXT,
  address TEXT,
  centroid GEOGRAPHY(POINT, 4326),
  
  -- Technical Rural Fields
  property_type TEXT, -- FAZENDA, SITIO, etc.
  aptitude TEXT[],    -- [AGRICULTURA, PECUARIA]
  total_area_ha NUMERIC(15,2),
  useful_area_ha NUMERIC(15,2),
  biome TEXT,
  topography TEXT,
  soil_texture TEXT,
  altitude NUMERIC(10,2),
  pluviometry NUMERIC(10,2),
  
  -- Technical Features (JSONB for extensibility)
  features JSONB DEFAULT '{}'::jsonb,
  
  -- Media
  images TEXT[] DEFAULT '{}',
  video_url TEXT,
  
  -- Metadata
  highlighted BOOLEAN DEFAULT false,
  is_confidential BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. PROPERTY POLYGONS (GIS)
CREATE TABLE IF NOT EXISTS property_polygons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  geom GEOMETRY(GEOMETRY, 4326),
  source TEXT, -- MANUAL, CAR, SIGEF
  area_calculated_ha NUMERIC(15,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. LEADS (CRM)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'Novo',
  source TEXT DEFAULT 'Direto',
  budget NUMERIC(20,2),
  preferences JSONB DEFAULT '{}'::jsonb,
  aptitude_interest TEXT[],
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. VISUAL EDITOR & SITE SETTINGS
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  agency_name TEXT,
  primary_color TEXT DEFAULT '#064e3b',
  secondary_color TEXT DEFAULT '#d4af37',
  logo_url TEXT,
  header_color TEXT,
  footer_text TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  layout_config JSONB DEFAULT '{}'::jsonb, -- Visual Editor Save State
  integrations JSONB DEFAULT '{}'::jsonb, -- Evolution API, Groq, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. DUE DILIGENCE
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

-- Indices
CREATE INDEX idx_props_org ON properties(organization_id);
CREATE INDEX idx_props_geom ON properties USING GIST (centroid);
CREATE INDEX idx_poly_geom ON property_polygons USING GIST (geom);
CREATE INDEX idx_leads_org ON leads(organization_id);

-- RLS (Basic tenant isolation)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation properties" ON properties 
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation leads" ON leads 
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- 9. EVOLUTION API (Messaging)
CREATE TABLE IF NOT EXISTS instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'close',
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

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  key_id TEXT NOT NULL,
  message_id TEXT,
  content TEXT,
  media_type TEXT DEFAULT 'text',
  from_me BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'sent',
  timestamp TIMESTAMPTZ DEFAULT now(),
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Messaging
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation instances" ON instances 
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation contacts" ON contacts 
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation messages" ON messages 
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
