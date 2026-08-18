-- ============================================
-- IMOBZY RURAL PLATFORM - DEFINITIVE SCHEMA
-- ============================================

-- 1. EXTENSÕES
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
  plan_id UUID,
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

-- 4. PROPERTIES (Rural & Urban)
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  broker_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(20,2),
  status TEXT DEFAULT 'Disponível',
  property_type TEXT DEFAULT 'Casa',
  purpose TEXT DEFAULT 'Venda',
  city TEXT,
  state TEXT,
  address TEXT,
  total_area_ha NUMERIC(15,2),
  useful_area_ha NUMERIC(15,2),
  features JSONB DEFAULT '{}'::jsonb,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. LEADS (CRM)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'Novo',
  source TEXT DEFAULT 'Direto',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. LANDING PAGES
CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, slug)
);

-- 7. SITE SETTINGS
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  agency_name TEXT,
  primary_color TEXT DEFAULT '#064e3b',
  secondary_color TEXT DEFAULT '#d4af37',
  logo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  layout_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
