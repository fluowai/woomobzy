-- ============================================================
-- Migration: 20260725_gamification_and_fintech.sql
-- Descrição: Tabelas para o Clube Imobzy (gamificação) e
--            Financial Hub (fintech - fiança e simulações)
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. GAMIFICATION PROFILES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gamification_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  points                  INTEGER NOT NULL DEFAULT 0,
  level                   TEXT    NOT NULL DEFAULT 'Bronze',
  streak_days             INTEGER NOT NULL DEFAULT 0,
  last_login_date         DATE,
  total_sales             INTEGER NOT NULL DEFAULT 0,
  total_rentals           INTEGER NOT NULL DEFAULT 0,
  total_leads_converted   INTEGER NOT NULL DEFAULT 0,
  total_properties_listed INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, organization_id)
);

-- ──────────────────────────────────────────────────────────────
-- 2. GAMIFICATION TRANSACTIONS (point log)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gamification_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  points    INTEGER NOT NULL,  -- positive = earned, negative = spent
  action    TEXT    NOT NULL,  -- e.g. 'sale_closed', 'daily_login', 'lead_converted'
  reference_id   UUID,         -- optional FK to the related record
  description    TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 3. GAMIFICATION REDEMPTIONS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gamification_redemptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  reward_id    TEXT NOT NULL,
  reward_name  TEXT NOT NULL,
  points_spent INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | fulfilled | rejected

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 4. FIANÇA REQUESTS (Fiança Aluguel Digital)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fianca_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Inquilino
  tenant_name    TEXT    NOT NULL,
  tenant_cpf     TEXT    NOT NULL,
  tenant_income  NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Imóvel
  property_type  TEXT    NOT NULL DEFAULT 'residential', -- residential | commercial
  rent_value     NUMERIC(12,2) NOT NULL DEFAULT 0,
  condo_fee      NUMERIC(12,2) NOT NULL DEFAULT 0,
  iptu_monthly   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_encargo  NUMERIC(12,2) GENERATED ALWAYS AS (rent_value + condo_fee + iptu_monthly) STORED,

  -- Análise
  income_multiplier NUMERIC(5,2),
  status            TEXT NOT NULL DEFAULT 'pending', -- pending | analysis | approved | rejected
  analysis_notes    TEXT,
  approved_at       TIMESTAMPTZ,
  rejected_at       TIMESTAMPTZ,

  -- Partner integration (future)
  partner_name     TEXT,   -- e.g. 'credpago', 'porto_seguro'
  partner_ref_id   TEXT,   -- external ID from partner API
  partner_response JSONB,  -- raw response from partner

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 5. RLS POLICIES
-- ──────────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE public.gamification_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fianca_requests         ENABLE ROW LEVEL SECURITY;

-- Gamification profiles: users see their own org
DROP POLICY IF EXISTS "gamification_profiles_select" ON public.gamification_profiles;
CREATE POLICY "gamification_profiles_select" ON public.gamification_profiles
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

DROP POLICY IF EXISTS "gamification_profiles_insert" ON public.gamification_profiles;
CREATE POLICY "gamification_profiles_insert" ON public.gamification_profiles
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "gamification_profiles_update" ON public.gamification_profiles;
CREATE POLICY "gamification_profiles_update" ON public.gamification_profiles
  FOR UPDATE USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- Gamification transactions: org scoped
DROP POLICY IF EXISTS "gamification_transactions_select" ON public.gamification_transactions;
CREATE POLICY "gamification_transactions_select" ON public.gamification_transactions
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

DROP POLICY IF EXISTS "gamification_transactions_insert" ON public.gamification_transactions;
CREATE POLICY "gamification_transactions_insert" ON public.gamification_transactions
  FOR INSERT WITH CHECK (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- Gamification redemptions: org scoped
DROP POLICY IF EXISTS "gamification_redemptions_select" ON public.gamification_redemptions;
CREATE POLICY "gamification_redemptions_select" ON public.gamification_redemptions
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

DROP POLICY IF EXISTS "gamification_redemptions_insert" ON public.gamification_redemptions;
CREATE POLICY "gamification_redemptions_insert" ON public.gamification_redemptions
  FOR INSERT WITH CHECK (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- Fianca requests: org scoped
DROP POLICY IF EXISTS "fianca_requests_select" ON public.fianca_requests;
CREATE POLICY "fianca_requests_select" ON public.fianca_requests
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

DROP POLICY IF EXISTS "fianca_requests_insert" ON public.fianca_requests;
CREATE POLICY "fianca_requests_insert" ON public.fianca_requests
  FOR INSERT WITH CHECK (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

DROP POLICY IF EXISTS "fianca_requests_update" ON public.fianca_requests;
CREATE POLICY "fianca_requests_update" ON public.fianca_requests
  FOR UPDATE USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- ──────────────────────────────────────────────────────────────
-- 6. INDEXES
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gamification_profiles_org   ON public.gamification_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_gamification_profiles_user  ON public.gamification_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_profiles_pts   ON public.gamification_profiles(organization_id, points DESC);
CREATE INDEX IF NOT EXISTS idx_gamification_txns_user      ON public.gamification_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gamification_redemptions_usr ON public.gamification_redemptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fianca_requests_org         ON public.fianca_requests(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fianca_requests_status      ON public.fianca_requests(organization_id, status);

-- ──────────────────────────────────────────────────────────────
-- 7. UPDATED_AT TRIGGER
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS set_gamification_profiles_updated_at ON public.gamification_profiles;
CREATE TRIGGER set_gamification_profiles_updated_at
  BEFORE UPDATE ON public.gamification_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_fianca_requests_updated_at ON public.fianca_requests;
CREATE TRIGGER set_fianca_requests_updated_at
  BEFORE UPDATE ON public.fianca_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
