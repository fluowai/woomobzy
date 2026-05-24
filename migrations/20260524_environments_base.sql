-- Base multiambiente Imobzy: organization -> environments (urban/rural)
-- Mantem compatibilidade com dados existentes fazendo backfill para o ambiente principal.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('urban', 'rural')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  brand_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organization_id, type),
  UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_environments_organization_id ON public.environments(organization_id);
CREATE INDEX IF NOT EXISTS idx_environments_type ON public.environments(type);
CREATE INDEX IF NOT EXISTS idx_environments_org_type ON public.environments(organization_id, type);

INSERT INTO public.environments (
  organization_id,
  type,
  name,
  slug,
  is_primary,
  brand_config,
  feature_flags
)
SELECT
  o.id,
  CASE WHEN o.niche = 'rural' THEN 'rural' ELSE 'urban' END,
  CASE WHEN o.niche = 'rural' THEN 'Imobzy Rural' ELSE 'Imobzy Urbana' END,
  CASE WHEN o.niche = 'rural' THEN 'rural' ELSE 'urban' END,
  true,
  '{}'::jsonb,
  '{}'::jsonb
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.environments e WHERE e.organization_id = o.id
);

DO $$
DECLARE
  table_name TEXT;
  tables TEXT[] := ARRAY[
    'properties',
    'leads',
    'landing_pages',
    'ai_agents',
    'site_settings',
    'whatsapp_instances',
    'rental_contracts',
    'billing',
    'developments'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id) ON DELETE CASCADE',
        table_name
      );
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  table_name TEXT;
  tables TEXT[] := ARRAY[
    'properties',
    'leads',
    'landing_pages',
    'ai_agents',
    'site_settings',
    'rental_contracts',
    'billing',
    'developments'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.%I t
         SET environment_id = e.id
         FROM public.environments e
         WHERE e.organization_id = t.organization_id
           AND e.is_primary = true
           AND t.environment_id IS NULL',
        table_name
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.whatsapp_instances') IS NOT NULL THEN
    UPDATE public.whatsapp_instances wi
    SET environment_id = e.id
    FROM public.environments e
    WHERE e.organization_id = wi.tenant_id
      AND e.is_primary = true
      AND wi.environment_id IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.properties') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_properties_environment_id ON public.properties(environment_id);
  END IF;
  IF to_regclass('public.leads') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_leads_environment_id ON public.leads(environment_id);
  END IF;
  IF to_regclass('public.landing_pages') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_landing_pages_environment_id ON public.landing_pages(environment_id);
  END IF;
  IF to_regclass('public.ai_agents') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_ai_agents_environment_id ON public.ai_agents(environment_id);
  END IF;
  IF to_regclass('public.site_settings') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_site_settings_environment_id ON public.site_settings(environment_id);
  END IF;
  IF to_regclass('public.whatsapp_instances') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_environment_id ON public.whatsapp_instances(environment_id);
  END IF;
  IF to_regclass('public.rental_contracts') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_rental_contracts_environment_id ON public.rental_contracts(environment_id);
  END IF;
  IF to_regclass('public.billing') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_billing_environment_id ON public.billing(environment_id);
  END IF;
  IF to_regclass('public.developments') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_developments_environment_id ON public.developments(environment_id);
  END IF;
END $$;

ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation environments" ON public.environments;
CREATE POLICY "Tenant isolation environments" ON public.environments
  FOR ALL
  USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );
