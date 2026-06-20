CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.rural_financial_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  target_vgv NUMERIC(16,2) NOT NULL DEFAULT 0,
  target_sales INTEGER NOT NULL DEFAULT 0,
  commission_rate NUMERIC(7,4) NOT NULL DEFAULT 0.05,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, period_month)
);

CREATE TABLE IF NOT EXISTS public.rural_property_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, property_id)
);

CREATE TABLE IF NOT EXISTS public.rural_property_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rural_goals_org_period
  ON public.rural_financial_goals (organization_id, period_month DESC);
CREATE INDEX IF NOT EXISTS idx_rural_favorites_profile
  ON public.rural_property_favorites (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rural_visits_profile_date
  ON public.rural_property_visits (profile_id, scheduled_at DESC);

ALTER TABLE public.rural_financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rural_property_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rural_property_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation rural goals" ON public.rural_financial_goals;
CREATE POLICY "Tenant isolation rural goals" ON public.rural_financial_goals
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Profile rural favorites" ON public.rural_property_favorites;
CREATE POLICY "Profile rural favorites" ON public.rural_property_favorites
  USING (
    profile_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Profile rural visits" ON public.rural_property_visits;
CREATE POLICY "Profile rural visits" ON public.rural_property_visits
  USING (
    profile_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );
