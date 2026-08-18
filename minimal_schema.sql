-- Minimal schema for local development with remote Supabase auth
-- This creates the essential tables without Supabase auth dependencies

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core tables
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    niche TEXT,
    is_reseller BOOLEAN DEFAULT false,
    parent_id UUID REFERENCES public.organizations(id),
    feature_flags JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id),
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'member',
    phone TEXT,
    email TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC,
    property_type TEXT,
    status TEXT DEFAULT 'active',
    address JSONB,
    features JSONB DEFAULT '{}',
    images TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    assigned_to UUID REFERENCES public.profiles(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    source TEXT,
    status TEXT DEFAULT 'new',
    property_interest UUID REFERENCES public.properties(id),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) UNIQUE,
    agency_name TEXT,
    primary_color TEXT DEFAULT '#16a34a',
    secondary_color TEXT DEFAULT '#1e293b',
    logo_url TEXT,
    header_color TEXT,
    footer_text TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    social_links JSONB DEFAULT '{}',
    layout_config JSONB DEFAULT '{}',
    integrations JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price_monthly NUMERIC DEFAULT 0,
    price_yearly NUMERIC DEFAULT 0,
    features JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) UNIQUE,
    plan_id UUID REFERENCES public.plans(id),
    status TEXT DEFAULT 'trial',
    trial_ends_at TIMESTAMPTZ,
    billing_email TEXT,
    billing_cycle TEXT DEFAULT 'monthly',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp tables
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    phone_number TEXT,
    status TEXT DEFAULT 'disconnected',
    qr_code TEXT,
    session_data JSONB,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES public.whatsapp_instances(id),
    phone TEXT NOT NULL,
    push_name TEXT,
    display_name TEXT,
    avatar_url TEXT,
    is_business BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(instance_id, phone)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES public.whatsapp_instances(id),
    contact_id UUID REFERENCES public.whatsapp_contacts(id),
    jid TEXT NOT NULL,
    name TEXT,
    unread_count INT DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    is_archived BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(instance_id, jid)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES public.whatsapp_instances(id),
    chat_id UUID REFERENCES public.whatsapp_chats(id),
    contact_id UUID REFERENCES public.whatsapp_contacts(id),
    message_id TEXT NOT NULL,
    from_me BOOLEAN DEFAULT false,
    type TEXT NOT NULL,
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    media_caption TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'sent',
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(instance_id, message_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_properties_organization ON public.properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_organization ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_organization ON public.whatsapp_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_instance ON public.whatsapp_chats(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat ON public.whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance ON public.whatsapp_messages(instance_id);

-- Insert default plans
INSERT INTO public.plans (name, slug, description, price_monthly, price_yearly, features, limits, is_active, sort_order) VALUES
('Gratuito', 'free', 'Plano gratuito para começar', 0, 0, '{"leads": 10, "properties": 5, "whatsapp": false}', '{"leads": 10, "properties": 5, "whatsapp_instances": 0}', true, 1),
('Starter', 'starter', 'Para corretores individuais', 99, 990, '{"leads": 100, "properties": 50, "whatsapp": true}', '{"leads": 100, "properties": 50, "whatsapp_instances": 1}', true, 2),
('Professional', 'professional', 'Para imobiliárias em crescimento', 299, 2990, '{"leads": 500, "properties": 200, "whatsapp": true, "api": true}', '{"leads": 500, "properties": 200, "whatsapp_instances": 3}', true, 3),
('Enterprise', 'enterprise', 'Para grandes operações', 999, 9990, '{"leads": -1, "properties": -1, "whatsapp": true, "api": true, "custom_domain": true}', '{"leads": -1, "properties": -1, "whatsapp_instances": 10}', true, 4)
ON CONFLICT (slug) DO NOTHING;

-- Insert default organization for testing
INSERT INTO public.organizations (id, name, slug, niche, is_reseller, feature_flags, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Organização Teste',
    'org-teste',
    'urbano',
    false,
    '{}',
    '{}'
)
ON CONFLICT (id) DO NOTHING;

-- Create a test profile (will be linked to Supabase auth user via id)
-- The id should match the Supabase auth user id
INSERT INTO public.profiles (id, organization_id, full_name, email, role)
VALUES (
    '11111111-1111-1111-1111-111111111111'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Usuário Teste',
    'teste@teste.com',
    'admin'
)
ON CONFLICT (id) DO NOTHING;

-- Link site settings
INSERT INTO public.site_settings (organization_id, agency_name, contact_email)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Imob Teste', 'teste@teste.com')
ON CONFLICT (organization_id) DO NOTHING;

-- Grant permissions for anon and authenticated roles (created by Supabase, but we create them here for local)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
    END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;