-- Persist Wootech Mail campaign data used by the real campaign dispatcher.
-- This removes the previous runtime dependency on in-code sample campaigns and
-- allows every dispatch to be traced to tenant-owned rows.

BEGIN;

CREATE TABLE IF NOT EXISTS public.mail_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mail_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.mail_senders(id),
  template_id UUID NOT NULL REFERENCES public.mail_templates(id),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'scheduled', 'sending', 'completed', 'partial', 'empty', 'failed')),
  audience_filter JSONB NOT NULL DEFAULT '{}',
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mail_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.mail_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'opened', 'clicked', 'bounced', 'unsubscribed')),
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_mail_templates_org ON public.mail_templates(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_campaigns_org_status ON public.mail_campaigns(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_campaign_recipients_campaign ON public.mail_campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_mail_campaign_recipients_org_email ON public.mail_campaign_recipients(organization_id, lower(email));

ALTER TABLE public.mail_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_campaign_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation mail_templates" ON public.mail_templates;
CREATE POLICY "Tenant isolation mail_templates" ON public.mail_templates
  FOR ALL USING (organization_id = get_auth_org_id() OR is_platform_admin_safe());

DROP POLICY IF EXISTS "Tenant isolation mail_campaigns" ON public.mail_campaigns;
CREATE POLICY "Tenant isolation mail_campaigns" ON public.mail_campaigns
  FOR ALL USING (organization_id = get_auth_org_id() OR is_platform_admin_safe());

DROP POLICY IF EXISTS "Tenant isolation mail_campaign_recipients" ON public.mail_campaign_recipients;
CREATE POLICY "Tenant isolation mail_campaign_recipients" ON public.mail_campaign_recipients
  FOR ALL USING (organization_id = get_auth_org_id() OR is_platform_admin_safe());

COMMIT;
