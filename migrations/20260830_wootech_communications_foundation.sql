-- migrations/20260830_wootech_communications_foundation.sql

-- ==========================================
-- WOOTECH COMMUNICATIONS FOUNDATION
-- Migration for Wootech AI Voz and Wootech Mail
-- ==========================================

BEGIN;

-- 1. FEATURE FLAGS
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    wootech_mail_enabled BOOLEAN DEFAULT false,
    wootech_ai_voice_enabled BOOLEAN DEFAULT false,
    ai_outbound_calls_enabled BOOLEAN DEFAULT false,
    voice_recording_enabled BOOLEAN DEFAULT false,
    email_marketing_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- 2. CREDENTIALS / SECRETS
CREATE TABLE IF NOT EXISTS public.provider_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    service VARCHAR(50) NOT NULL, -- e.g., 'openai', 'groq', 'twilio', 'billionmail'
    api_key_encrypted TEXT NOT NULL,
    config_json JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CUSTOMER INTERACTIONS (OMNICHANNEL TIMELINE)
CREATE TABLE IF NOT EXISTS public.customer_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL, -- 'whatsapp', 'email', 'voice', 'system'
    event_type VARCHAR(100) NOT NULL, -- 'email.sent', 'voice.completed', 'whatsapp.read'
    direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound'
    content TEXT,
    metadata JSONB DEFAULT '{}',
    correlation_id UUID, -- to link calls, emails, logic
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. WOOTECH AI VOZ CORE
CREATE TABLE IF NOT EXISTS public.voice_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'receptionist', 'sdr', 'broker'
    language VARCHAR(10) DEFAULT 'pt-BR',
    llm_provider VARCHAR(50) DEFAULT 'openai',
    llm_model VARCHAR(50) DEFAULT 'gpt-4o',
    voice_provider VARCHAR(50) DEFAULT 'elevenlabs',
    voice_id VARCHAR(100),
    system_prompt TEXT NOT NULL,
    temperature NUMERIC(3, 2) DEFAULT 0.7,
    allow_interruption BOOLEAN DEFAULT true,
    human_transfer_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.voice_agent_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.voice_agents(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL, -- e.g., 'search_properties', 'create_lead'
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, tool_name)
);

CREATE TABLE IF NOT EXISTS public.voice_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.voice_agents(id),
    lead_id UUID REFERENCES public.leads(id),
    direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound'
    phone_number VARCHAR(20),
    status VARCHAR(50) NOT NULL, -- 'completed', 'failed', 'transferred'
    duration_seconds INTEGER DEFAULT 0,
    transcript TEXT,
    summary TEXT,
    recording_url TEXT,
    llm_tokens_used INTEGER DEFAULT 0,
    cost_estimated NUMERIC(10, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. WOOTECH MAIL CORE
CREATE TABLE IF NOT EXISTS public.mail_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'verified', 'failed'
    dns_records JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, domain)
);

CREATE TABLE IF NOT EXISTS public.mail_senders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES public.mail_domains(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, email)
);

-- RLS Policies (Base Level)
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_senders ENABLE ROW LEVEL SECURITY;

-- Exemplo de política de segurança (Safe Select usando get_auth_org_id())
CREATE POLICY "Tenant isolation feature_flags" ON public.feature_flags FOR ALL USING (organization_id = get_auth_org_id() OR is_platform_admin_safe());
CREATE POLICY "Tenant isolation provider_credentials" ON public.provider_credentials FOR ALL USING (organization_id = get_auth_org_id() OR is_platform_admin_safe());
CREATE POLICY "Tenant isolation customer_interactions" ON public.customer_interactions FOR ALL USING (organization_id = get_auth_org_id() OR is_platform_admin_safe());
CREATE POLICY "Tenant isolation voice_agents" ON public.voice_agents FOR ALL USING (organization_id = get_auth_org_id() OR is_platform_admin_safe());
CREATE POLICY "Tenant isolation voice_agent_tools" ON public.voice_agent_tools FOR ALL USING (agent_id IN (SELECT id FROM public.voice_agents WHERE organization_id = get_auth_org_id()) OR is_platform_admin_safe());
CREATE POLICY "Tenant isolation voice_calls" ON public.voice_calls FOR ALL USING (organization_id = get_auth_org_id() OR is_platform_admin_safe());
CREATE POLICY "Tenant isolation mail_domains" ON public.mail_domains FOR ALL USING (organization_id = get_auth_org_id() OR is_platform_admin_safe());
CREATE POLICY "Tenant isolation mail_senders" ON public.mail_senders FOR ALL USING (organization_id = get_auth_org_id() OR is_platform_admin_safe());

COMMIT;
