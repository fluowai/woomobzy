-- Urban operations modules: lots, keys, condominiums, documents and portal sync.

CREATE TABLE IF NOT EXISTS public.urban_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  development_id UUID NOT NULL REFERENCES public.developments(id) ON DELETE CASCADE,
  block_name TEXT NOT NULL DEFAULT 'Quadra A',
  lot_number TEXT NOT NULL,
  area_m2 NUMERIC(12,2) DEFAULT 0,
  price NUMERIC(14,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'blocked')),
  buyer_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  reservation_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.key_control (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'checked_out', 'overdue', 'lost')),
  location TEXT,
  responsible_name TEXT,
  checked_out_at TIMESTAMPTZ,
  expected_return_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.condominiums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  units_count INTEGER DEFAULT 0,
  residents_count INTEGER DEFAULT 0,
  delinquent_units INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.condominium_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  condominium_id UUID REFERENCES public.condominiums(id) ON DELETE CASCADE,
  unit_label TEXT,
  category TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.urban_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'signed', 'expired', 'rejected')),
  file_url TEXT,
  file_size TEXT,
  expires_at DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.urban_portal_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  portal_key TEXT NOT NULL,
  portal_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  configured BOOLEAN DEFAULT false,
  feed_url TEXT,
  last_sync_at TIMESTAMPTZ,
  exported_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, portal_key)
);

CREATE TABLE IF NOT EXISTS public.urban_portal_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.urban_portal_integrations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'warning', 'error')),
  message TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.urban_financing_simulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Simulacao financeira',
  property_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  entry_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  installments_count INTEGER NOT NULL DEFAULT 1,
  monthly_interest_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  balloon_payments JSONB NOT NULL DEFAULT '[]'::jsonb,
  monthly_installment NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_financed NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'proposal', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.urban_property_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_urban_lots_org_dev_status ON public.urban_lots (organization_id, development_id, status);
CREATE INDEX IF NOT EXISTS idx_key_control_org_status ON public.key_control (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_condominiums_org ON public.condominiums (organization_id);
CREATE INDEX IF NOT EXISTS idx_condominium_tickets_org_status ON public.condominium_tickets (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_urban_documents_org_status ON public.urban_documents (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_urban_portals_org ON public.urban_portal_integrations (organization_id);
CREATE INDEX IF NOT EXISTS idx_urban_simulations_org_created ON public.urban_financing_simulations (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_urban_favorites_profile ON public.urban_property_favorites (profile_id, created_at DESC);

ALTER TABLE public.urban_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominium_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urban_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urban_portal_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urban_portal_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urban_financing_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urban_property_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation urban_lots" ON public.urban_lots;
CREATE POLICY "Tenant isolation urban_lots" ON public.urban_lots
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation key_control" ON public.key_control;
CREATE POLICY "Tenant isolation key_control" ON public.key_control
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation condominiums" ON public.condominiums;
CREATE POLICY "Tenant isolation condominiums" ON public.condominiums
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation condominium_tickets" ON public.condominium_tickets;
CREATE POLICY "Tenant isolation condominium_tickets" ON public.condominium_tickets
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation urban_documents" ON public.urban_documents;
CREATE POLICY "Tenant isolation urban_documents" ON public.urban_documents
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation urban_portal_integrations" ON public.urban_portal_integrations;
CREATE POLICY "Tenant isolation urban_portal_integrations" ON public.urban_portal_integrations
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation urban_portal_sync_logs" ON public.urban_portal_sync_logs;
CREATE POLICY "Tenant isolation urban_portal_sync_logs" ON public.urban_portal_sync_logs
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation urban_financing_simulations" ON public.urban_financing_simulations;
CREATE POLICY "Tenant isolation urban_financing_simulations" ON public.urban_financing_simulations
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Profile favorites" ON public.urban_property_favorites;
CREATE POLICY "Profile favorites" ON public.urban_property_favorites
  USING (
    profile_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );
