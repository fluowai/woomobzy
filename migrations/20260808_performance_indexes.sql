-- performance_indexes_20260808.sql
-- Índices adicionados para reduzir lentidão em filtros, N+1 e RLS.

-- 1) FK e filtros comuns sem índice
CREATE INDEX IF NOT EXISTS idx_properties_broker_id
  ON public.properties (broker_id);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to
  ON public.leads (assigned_to);

CREATE INDEX IF NOT EXISTS idx_leads_property_id
  ON public.leads (property_id);

CREATE INDEX IF NOT EXISTS idx_site_settings_org
  ON public.site_settings (organization_id);

CREATE INDEX IF NOT EXISTS idx_landing_pages_user_id
  ON public.landing_pages (user_id);

-- 2) Índices compostos para filtros frequentes
CREATE INDEX IF NOT EXISTS idx_properties_org_status
  ON public.properties (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_properties_org_created
  ON public.properties (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_org_status
  ON public.leads (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_leads_org_created
  ON public.leads (organization_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_contracts_org_status
  ON public.rental_contracts (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_campaigns_org_status
  ON public.campaigns (organization_id, status);

-- 3) Índice para busca exata de telefone normalizado (quando a coluna existir)
-- Se a coluna não existir ainda, o índice não será criado, então usamos DO:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'phone_normalized'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_org_phone_normalized
      ON public.leads (organization_id, phone_normalized);
  END IF;
END;
$$;

-- 4) Índice para blacklist de campanha (usado no dispatcher)
CREATE INDEX IF NOT EXISTS idx_campaign_blacklist_org_phone
  ON public.campaign_blacklist (organization_id, phone);

-- 5) Índice para contagem diária do dispatcher
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_sent_today
  ON public.campaign_contacts (campaign_id, instance_id, sent_at)
  WHERE status = 'sent';

-- 6) Índice para reseller/domain discovery
CREATE INDEX IF NOT EXISTS idx_reseller_infrastructure_active_domain
  ON public.reseller_infrastructure (is_active, domain)
  WHERE is_active = true;

-- 7) Text search para properties (GIN + trigram)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_properties_search_gin
  ON public.properties
  USING GIN (
    to_tsvector('portuguese', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(city, ''))
  );

CREATE INDEX IF NOT EXISTS idx_properties_title_trgm
  ON public.properties USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_properties_city_trgm
  ON public.properties USING GIN (city gin_trgm_ops);

-- 8) Índice em profiles para lookup por email/org
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles (email);

CREATE INDEX IF NOT EXISTS idx_profiles_org_role
  ON public.profiles (organization_id, role);
