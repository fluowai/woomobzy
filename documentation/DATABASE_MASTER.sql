-- ============================================
-- IMOBZY PRODUCTION MASTER SCHEMA
-- Version: 1.1.0 (Production Ready)
-- ============================================

-- 1. BASE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ORGANIZATIONS (Multi-tenant Root)
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

-- 3. PROFILES (Security & User Meta)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('superadmin', 'admin', 'broker', 'user')),
  avatar_url TEXT,
  phone TEXT,
  creci TEXT,
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
  property_type TEXT DEFAULT 'Casa', -- Fazenda, Casa, Sítio, etc.
  purpose TEXT DEFAULT 'Venda',
  city TEXT,
  state TEXT,
  address TEXT,
  total_area_ha NUMERIC(15,2),
  useful_area_ha NUMERIC(15,2),
  biome TEXT,
  topography TEXT,
  images TEXT[] DEFAULT '{}',
  features JSONB DEFAULT '{}'::jsonb,
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
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. LANDING PAGES & VISUAL EDITOR
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

CREATE TABLE IF NOT EXISTS site_texts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  UNIQUE(organization_id, key)
);

-- 7. WHATSAPP INTEGRATION (Baileys)
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected',
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  jid TEXT NOT NULL,
  name TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_id, jid)
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES whatsapp_chats(id) ON DELETE CASCADE,
  key_id TEXT,
  content TEXT,
  from_me BOOLEAN DEFAULT false,
  message_type TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- 8. DOMAINS
CREATE TABLE IF NOT EXISTS domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending', -- pending, active, error
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SECURITY: RLS & POLICIES (CORE)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy: Check User's Organization
-- This ensures that users can only interact with their own data
CREATE OR REPLACE FUNCTION get_user_org() RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Example Policy (Applying to all tenant-aware tables)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
    AND tablename NOT IN ('organizations', 'plans', 'saas_settings') LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Tenant isolation %I" ON %I USING (organization_id = get_user_org())', t, t);
  END LOOP;
END $$;

-- Exceptions: Public Access
CREATE POLICY "Public read site_settings" ON site_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Public read landing_pages" ON landing_pages FOR SELECT TO anon USING (true);
CREATE POLICY "Public read properties" ON properties FOR SELECT TO anon USING (true);
CREATE POLICY "Public read site_texts" ON site_texts FOR SELECT TO anon USING (true);

-- Profiles Isolation (Users see colleagues, SuperAdmin sees all)
DROP POLICY IF EXISTS "Profile Isolation" ON profiles;
CREATE POLICY "Profile Isolation" ON profiles
  FOR SELECT USING (organization_id = get_user_org() OR role = 'superadmin');

-- ============================================
-- PERFORMANCE: INDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_props_org ON properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_msgs_chat ON whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_msgs_instance ON whatsapp_messages(instance_id);
