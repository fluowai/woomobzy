-- ============================================
-- CAMPAIGN SYSTEM - WhatsApp Disparo
-- ============================================

-- A. Campanha principal
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','running','paused','completed','cancelled')),

  -- Configuração da mensagem
  message_template TEXT,
  message_variables JSONB DEFAULT '[]'::jsonb,
  ai_prompt TEXT,
  ai_provider TEXT DEFAULT 'gemini',

  -- Configuração de disparo
  dispatch_mode TEXT DEFAULT 'round_robin' CHECK (dispatch_mode IN ('sequential','round_robin','random')),
  min_delay_seconds INT DEFAULT 45,
  max_delay_seconds INT DEFAULT 120,
  daily_limit_per_instance INT DEFAULT 50,
  working_hours_start INT DEFAULT 8,
  working_hours_end INT DEFAULT 20,

  -- Estatísticas
  total_contacts INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,

  -- Cronograma
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- B. Contatos da campanha
CREATE TABLE IF NOT EXISTS public.campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  company TEXT,
  source TEXT DEFAULT 'manual',
  metadata JSONB DEFAULT '{}'::jsonb,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','queued','sent','delivered','failed','blacklisted')),
  sent_at TIMESTAMPTZ,
  instance_id UUID REFERENCES public.whatsapp_instances(id),
  error_message TEXT,
  ai_message TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, phone)
);

-- C. Instâncias atribuídas à campanha
CREATE TABLE IF NOT EXISTS public.campaign_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  daily_sent_count INT DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(campaign_id, instance_id)
);

-- D. Cache de buscas Serper
CREATE TABLE IF NOT EXISTS public.campaign_serper_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  gl TEXT DEFAULT 'br',
  search_type TEXT DEFAULT 'places',
  results JSONB DEFAULT '[]'::jsonb,
  result_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- E. Blacklist global
CREATE TABLE IF NOT EXISTS public.campaign_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, phone)
);

-- F. Log de disparo (auditoria)
CREATE TABLE IF NOT EXISTS public.campaign_dispatch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.campaign_contacts(id),
  instance_id UUID REFERENCES public.whatsapp_instances(id),
  action TEXT NOT NULL,
  detail JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON public.campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign ON public.campaign_contacts(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_phone ON public.campaign_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_campaign_instances_campaign ON public.campaign_instances(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_serper_cache_org ON public.campaign_serper_cache(organization_id, query);
CREATE INDEX IF NOT EXISTS idx_campaign_blacklist_org_phone ON public.campaign_blacklist(organization_id, phone);
CREATE INDEX IF NOT EXISTS idx_campaign_dispatch_log_campaign ON public.campaign_dispatch_log(campaign_id, created_at);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_serper_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_dispatch_log ENABLE ROW LEVEL SECURITY;

-- Campaigns: tenant isolation
DROP POLICY IF EXISTS campaigns_tenant_select ON public.campaigns;
CREATE POLICY campaigns_tenant_select ON public.campaigns
  FOR SELECT USING (organization_id = auth.uid()::text::uuid);

DROP POLICY IF EXISTS campaigns_tenant_write ON public.campaigns;
CREATE POLICY campaigns_tenant_write ON public.campaigns
  FOR ALL USING (organization_id = auth.uid()::text::uuid);

-- Campaign contacts: via campaign
DROP POLICY IF EXISTS campaign_contacts_tenant ON public.campaign_contacts;
CREATE POLICY campaign_contacts_tenant ON public.campaign_contacts
  FOR ALL USING (
    campaign_id IN (SELECT id FROM public.campaigns WHERE organization_id = auth.uid()::text::uuid)
  );

-- Campaign instances: via campaign
DROP POLICY IF EXISTS campaign_instances_tenant ON public.campaign_instances;
CREATE POLICY campaign_instances_tenant ON public.campaign_instances
  FOR ALL USING (
    campaign_id IN (SELECT id FROM public.campaigns WHERE organization_id = auth.uid()::text::uuid)
  );

-- Serper cache: tenant isolation
DROP POLICY IF EXISTS campaign_serper_cache_tenant ON public.campaign_serper_cache;
CREATE POLICY campaign_serper_cache_tenant ON public.campaign_serper_cache
  FOR ALL USING (organization_id = auth.uid()::text::uuid);

-- Blacklist: tenant isolation
DROP POLICY IF EXISTS campaign_blacklist_tenant ON public.campaign_blacklist;
CREATE POLICY campaign_blacklist_tenant ON public.campaign_blacklist
  FOR ALL USING (organization_id = auth.uid()::text::uuid);

-- Dispatch log: via campaign
DROP POLICY IF EXISTS campaign_dispatch_log_tenant ON public.campaign_dispatch_log;
CREATE POLICY campaign_dispatch_log_tenant ON public.campaign_dispatch_log
  FOR ALL USING (
    campaign_id IN (SELECT id FROM public.campaigns WHERE organization_id = auth.uid()::text::uuid)
  );

NOTIFY pgrst, 'reload schema';
