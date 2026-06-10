-- Portal integrations (VivaReal, Zap Imóveis, QuintoAndar, ImovelWeb)
-- Each organization can configure credentials per portal

CREATE TABLE IF NOT EXISTS public.portal_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    portal TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT portal_integrations_org_portal_unique UNIQUE (organization_id, portal)
);

CREATE INDEX IF NOT EXISTS idx_portal_integrations_org
  ON public.portal_integrations(organization_id);

CREATE INDEX IF NOT EXISTS idx_portal_integrations_portal
  ON public.portal_integrations(portal);

ALTER TABLE public.portal_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on portal integrations" ON public.portal_integrations;
CREATE POLICY "Service role full access on portal integrations"
  ON public.portal_integrations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Track publish status per portal per property
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS portal_publishes JSONB DEFAULT '{}'::jsonb;
