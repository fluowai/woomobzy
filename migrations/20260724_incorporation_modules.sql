-- Incorporation modules: Availability maps, Reservations, Financial Transfers, Post-Obra, NPS

CREATE TABLE IF NOT EXISTS public.availability_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  development_id UUID REFERENCES public.developments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  svg_url TEXT,
  config_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.unit_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.urban_lots(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  bank_name TEXT NOT NULL,
  total_amount NUMERIC(14,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'analysis' CHECK (status IN ('analysis', 'engineering', 'contract', 'released', 'rejected')),
  expected_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_obra_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'inspection', 'repairing', 'done', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nps_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nps_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.nps_campaigns(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 0 AND score <= 10),
  feedback TEXT,
  responded_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_availability_maps_org ON public.availability_maps(organization_id);
CREATE INDEX IF NOT EXISTS idx_unit_reservations_org ON public.unit_reservations(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_transfers_org ON public.financial_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_pos_obra_tickets_org ON public.pos_obra_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_nps_campaigns_org ON public.nps_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_nps_responses_org ON public.nps_responses(organization_id);

-- RLS
ALTER TABLE public.availability_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_obra_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nps_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tenant isolation availability_maps" ON public.availability_maps USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant isolation unit_reservations" ON public.unit_reservations USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant isolation financial_transfers" ON public.financial_transfers USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant isolation pos_obra_tickets" ON public.pos_obra_tickets USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant isolation nps_campaigns" ON public.nps_campaigns USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant isolation nps_responses" ON public.nps_responses USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
