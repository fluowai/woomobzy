-- meta_lead_ads_integration.sql
-- Integração de Meta Lead Ads: deduplicação, auditoria e roteamento por formulário/campanha.

-- 1. Campos de dedup e origem no lead
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS meta_lead_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_form_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_ad_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_ad_name TEXT,
  ADD COLUMN IF NOT EXISTS meta_payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_meta_lead_id
  ON public.leads(meta_lead_id)
  WHERE meta_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_meta_form
  ON public.leads(meta_form_id);

CREATE INDEX IF NOT EXISTS idx_leads_meta_campaign
  ON public.leads(meta_campaign_id);

-- 2. Tabela de configuração de roteamento por formulário/campanha/anúncio
CREATE TABLE IF NOT EXISTS public.meta_lead_ads_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  meta_form_id TEXT,
  meta_campaign_id TEXT,
  meta_ad_id TEXT,
  assigned_agent_id UUID REFERENCES public.profiles(id),
  priority INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT meta_lead_ads_config_org_form_key UNIQUE (organization_id, meta_form_id),
  CONSTRAINT meta_lead_ads_config_org_campaign_key UNIQUE (organization_id, meta_campaign_id),
  CONSTRAINT meta_lead_ads_config_org_ad_key UNIQUE (organization_id, meta_ad_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_lead_ads_config_org
  ON public.meta_lead_ads_config(organization_id);

CREATE INDEX IF NOT EXISTS idx_meta_lead_ads_config_form
  ON public.meta_lead_ads_config(meta_form_id);

CREATE INDEX IF NOT EXISTS idx_meta_lead_ads_config_campaign
  ON public.meta_lead_ads_config(meta_campaign_id);

-- 3. Tabela de auditoria de webhooks
CREATE TABLE IF NOT EXISTS public.meta_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  meta_lead_id TEXT,
  event_type TEXT,
  payload JSONB,
  status TEXT,
  error_message TEXT,
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_org
  ON public.meta_webhook_events(organization_id);

CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_lead
  ON public.meta_webhook_events(meta_lead_id);

CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_status
  ON public.meta_webhook_events(status);

-- 4. RLS básico
ALTER TABLE public.meta_lead_ads_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin manages meta config" ON public.meta_lead_ads_config
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmin reads meta webhook events" ON public.meta_webhook_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'superadmin'
    )
  );

CREATE POLICY "Service inserts meta webhook events" ON public.meta_webhook_events
  FOR INSERT TO authenticated
  WITH CHECK (true);
