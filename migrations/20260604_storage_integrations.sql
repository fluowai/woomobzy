-- Storage provider integrations managed from the SuperAdmin panel.

CREATE TABLE IF NOT EXISTS public.storage_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT storage_integrations_provider_unique UNIQUE (provider)
);

CREATE INDEX IF NOT EXISTS idx_storage_integrations_provider
  ON public.storage_integrations(provider);

ALTER TABLE public.storage_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on storage integrations" ON public.storage_integrations;
CREATE POLICY "Service role full access on storage integrations"
  ON public.storage_integrations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
