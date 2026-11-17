-- Migração idempotente para tabelas auxiliares, RPCs de analytics e buckets de storage ausentes no ambiente de produção.

-- 1. Garantir colunas de contagem na tabela landing_pages (caso ausentes)
ALTER TABLE IF EXISTS public.landing_pages
  ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads_count INTEGER NOT NULL DEFAULT 0;

-- 2. Analytics de Landing Pages
CREATE TABLE IF NOT EXISTS public.landing_page_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  visitor_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  event_data JSONB DEFAULT '{}'::jsonb,
  country TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lp_analytics_page_created
  ON public.landing_page_analytics (landing_page_id, created_at DESC);

ALTER TABLE public.landing_page_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lp_analytics_public_insert" ON public.landing_page_analytics;
CREATE POLICY "lp_analytics_public_insert"
  ON public.landing_page_analytics
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "lp_analytics_org_select" ON public.landing_page_analytics;
CREATE POLICY "lp_analytics_org_select"
  ON public.landing_page_analytics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.landing_pages lp
      JOIN public.profiles p ON p.organization_id = lp.organization_id
      WHERE lp.id = landing_page_analytics.landing_page_id
        AND p.id = auth.uid()
    )
  );

-- 3. RPCs para incrementar views/leads de Landing Pages
CREATE OR REPLACE FUNCTION public.increment_landing_page_views(page_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.landing_pages
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = page_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_landing_page_leads(page_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.landing_pages
  SET leads_count = COALESCE(leads_count, 0) + 1
  WHERE id = page_id;
END;
$$;

-- 4. Blocos salvos de Landing Pages
CREATE TABLE IF NOT EXISTS public.landing_page_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  thumbnail TEXT,
  is_template BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lp_blocks_org
  ON public.landing_page_blocks (organization_id, created_at DESC);

ALTER TABLE public.landing_page_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lp_blocks_org_all" ON public.landing_page_blocks;
CREATE POLICY "lp_blocks_org_all"
  ON public.landing_page_blocks
  FOR ALL
  USING (
    organization_id IS NULL
    OR organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IS NULL
    OR organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 5. Campanhas de Email Drip
CREATE TABLE IF NOT EXISTS public.email_drip_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  template_key TEXT,
  campaign_type TEXT,
  step INTEGER DEFAULT 1,
  subject TEXT,
  template TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_drip_org_status
  ON public.email_drip_campaigns (organization_id, status, scheduled_at);

ALTER TABLE public.email_drip_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_drip_org_all" ON public.email_drip_campaigns;
CREATE POLICY "email_drip_org_all"
  ON public.email_drip_campaigns
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 6. Solicitações de Certidão ONR
CREATE TABLE IF NOT EXISTS public.onr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  registration_number TEXT,
  cns TEXT,
  certificate_type TEXT DEFAULT 'INTEIRO_TEOR',
  protocol TEXT,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  requested_by UUID,
  estimated_delivery TIMESTAMPTZ,
  cost NUMERIC(12,2),
  result_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onr_requests_org_prop
  ON public.onr_requests (organization_id, property_id, created_at DESC);

ALTER TABLE public.onr_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onr_requests_org_all" ON public.onr_requests;
CREATE POLICY "onr_requests_org_all"
  ON public.onr_requests
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 7. Buckets necessários no Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('imobzyimg', 'imobzyimg', true),
  ('imobzymsg', 'imobzymsg', true),
  ('documents', 'documents', true),
  ('exports', 'exports', true),
  ('contracts', 'contracts', true),
  ('agency-assets', 'agency-assets', true),
  ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

