-- ============================================================================
-- Migration: Fix ALL production 404/400/500 errors
-- Date: 2026-07-30
-- Fixes:
--   1. 404 GET /rest/v1/condominium_tickets (table did not exist)
--   2. 400 GET /rest/v1/condominiums (missing columns)
--   3. 500 GET /api/locacao/leases (rental_contracts table missing columns)
--   4. 500 GET /api/crm/clients (clients table missing)
--   5. 500 GET /api/crm/leads (lead_activities table missing columns)
--
-- Safe to run multiple times (idempotent).
-- ============================================================================

-- ============================================================
-- 1. Ensure helper functions exist
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'organization_id', '')::uuid,
    (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Ensure condominiums table exists (idempotent)
-- ============================================================
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
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns idempotently
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'condominiums' AND column_name = 'status') THEN
    ALTER TABLE public.condominiums ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'condominiums' AND column_name = 'units_count') THEN
    ALTER TABLE public.condominiums ADD COLUMN units_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'condominiums' AND column_name = 'delinquent_units') THEN
    ALTER TABLE public.condominiums ADD COLUMN delinquent_units INTEGER DEFAULT 0;
  END IF;
END $$;

-- RLS for condominiums
ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation condominiums" ON public.condominiums;
CREATE POLICY "Tenant isolation condominiums" ON public.condominiums
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS on_condominiums_updated ON public.condominiums;
CREATE TRIGGER on_condominiums_updated
  BEFORE UPDATE ON public.condominiums
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_condominiums_org ON public.condominiums (organization_id);

-- ============================================================
-- 3. Ensure condominium_tickets table exists (idempotent)
-- ============================================================
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

ALTER TABLE public.condominium_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation condominium_tickets" ON public.condominium_tickets;
CREATE POLICY "Tenant isolation condominium_tickets" ON public.condominium_tickets
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS on_condominium_tickets_updated ON public.condominium_tickets;
CREATE TRIGGER on_condominium_tickets_updated
  BEFORE UPDATE ON public.condominium_tickets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_condominium_tickets_org_status ON public.condominium_tickets (organization_id, status);

-- ============================================================
-- 4. Ensure rental_contracts table exists (for /api/locacao/leases)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rental_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tenant_name TEXT NOT NULL,
  tenant_email TEXT,
  tenant_phone TEXT,
  tenant_cpf TEXT,
  tenant_rg TEXT,
  tenant_type TEXT CHECK (tenant_type IN ('PF', 'PJ')),
  tenant_birth_date DATE,
  tenant_marital_status TEXT,
  tenant_profession TEXT,
  tenant_employer TEXT,
  tenant_monthly_income NUMERIC(12,2),
  tenant_address TEXT,
  tenant_city TEXT,
  tenant_state TEXT,
  tenant_zip TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  reference_1_name TEXT,
  reference_1_phone TEXT,
  reference_2_name TEXT,
  reference_2_phone TEXT,
  start_date DATE,
  end_date DATE,
  monthly_rent NUMERIC(12,2) DEFAULT 0,
  due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
  adjustment_index TEXT DEFAULT 'IGPM',
  guarantee_type TEXT,
  guarantee_document TEXT,
  deposit_caucao_amount NUMERIC(12,2),
  insurance_company TEXT,
  insurance_policy_number TEXT,
  late_fee_percent NUMERIC(5,2) DEFAULT 2.00,
  late_interest_percent NUMERIC(8,5) DEFAULT 0.03333,
  contract_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'cadastral_analysis', 'income_analysis', 'pending_signatures', 'active', 'suspended', 'terminated', 'expired', 'archived')),
  payment_status TEXT DEFAULT 'em_dia' CHECK (payment_status IN ('em_dia', 'atrasado', 'inadimplente')),
  observation TEXT,
  notes TEXT,
  evaluation_score INTEGER DEFAULT 0,
  evaluation_status TEXT DEFAULT 'em_analise',
  credit_score INTEGER,
  has_restrictions BOOLEAN DEFAULT false,
  restriction_notes TEXT,
  income_proof_status TEXT DEFAULT 'pendente',
  guarantor_name TEXT,
  guarantor_cpf TEXT,
  guarantor_phone TEXT,
  guarantor_monthly_income NUMERIC(12,2),
  recommended_limit NUMERIC(12,2),
  analysis_notes TEXT,
  signed_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation rental_contracts" ON public.rental_contracts;
CREATE POLICY "Tenant isolation rental_contracts" ON public.rental_contracts
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS on_rental_contracts_updated ON public.rental_contracts;
CREATE TRIGGER on_rental_contracts_updated
  BEFORE UPDATE ON public.rental_contracts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_rental_contracts_org_status ON public.rental_contracts (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_org_created ON public.rental_contracts (organization_id, created_at DESC);

-- ============================================================
-- 5. Ensure lease_history table exists (for /api/locacao/leases POST)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lease_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES public.rental_contracts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lease_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation lease_history" ON public.lease_history;
CREATE POLICY "Tenant isolation lease_history" ON public.lease_history
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_lease_history_lease ON public.lease_history (lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_history_created ON public.lease_history (created_at);

-- ============================================================
-- 6. Ensure public.clients table exists (for /api/crm/clients)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  document_type TEXT DEFAULT 'CPF',
  document_number TEXT,
  cpf_cnpj TEXT,
  roles TEXT[] DEFAULT '{Cliente}',
  birth_date DATE,
  marital_status TEXT,
  profession TEXT,
  monthly_income NUMERIC(12,2),
  address_zip TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_clients" ON public.clients;
DROP POLICY IF EXISTS "Tenant isolation clients" ON public.clients;
DROP POLICY IF EXISTS "superadmin_all_clients" ON public.clients;

CREATE POLICY "tenant_isolation_clients" ON public.clients
  FOR ALL USING (organization_id = public.get_my_org_id() OR public.is_superadmin());
CREATE POLICY "superadmin_all_clients" ON public.clients
  FOR ALL USING (public.is_superadmin());

DROP TRIGGER IF EXISTS on_clients_updated ON public.clients;
CREATE TRIGGER on_clients_updated
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

GRANT ALL ON public.clients TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================
-- 7. Add missing columns to leads table (if it exists)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'lead_score') THEN
      ALTER TABLE public.leads ADD COLUMN lead_score INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'ai_next_action') THEN
      ALTER TABLE public.leads ADD COLUMN ai_next_action TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'next_follow_up_at') THEN
      ALTER TABLE public.leads ADD COLUMN next_follow_up_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'next_visit_at') THEN
      ALTER TABLE public.leads ADD COLUMN next_visit_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'chat_jid') THEN
      ALTER TABLE public.leads ADD COLUMN chat_jid TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'campaign') THEN
      ALTER TABLE public.leads ADD COLUMN campaign TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'classification') THEN
      ALTER TABLE public.leads ADD COLUMN classification TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'budget_min') THEN
      ALTER TABLE public.leads ADD COLUMN budget_min NUMERIC(14,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'budget_max') THEN
      ALTER TABLE public.leads ADD COLUMN budget_max NUMERIC(14,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'bedrooms') THEN
      ALTER TABLE public.leads ADD COLUMN bedrooms INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'area_min') THEN
      ALTER TABLE public.leads ADD COLUMN area_min NUMERIC(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'area_max') THEN
      ALTER TABLE public.leads ADD COLUMN area_max NUMERIC(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'property_type') THEN
      ALTER TABLE public.leads ADD COLUMN property_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'property_id') THEN
      ALTER TABLE public.leads ADD COLUMN property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'client_id') THEN
      ALTER TABLE public.leads ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'last_contacted_at') THEN
      ALTER TABLE public.leads ADD COLUMN last_contacted_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'ad_reference') THEN
      ALTER TABLE public.leads ADD COLUMN ad_reference TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'organic_channel') THEN
      ALTER TABLE public.leads ADD COLUMN organic_channel TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'budget') THEN
      ALTER TABLE public.leads ADD COLUMN budget TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'aptitude_interest') THEN
      ALTER TABLE public.leads ADD COLUMN aptitude_interest TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'preferences') THEN
      ALTER TABLE public.leads ADD COLUMN preferences JSONB DEFAULT '{}';
    END IF;
  END IF;
END $$;

-- ============================================================
-- 8. Ensure lead_activities table exists
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation lead_activities" ON public.lead_activities;
CREATE POLICY "Tenant isolation lead_activities" ON public.lead_activities
  FOR ALL TO authenticated
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON public.lead_activities (lead_id, created_at DESC);

-- ============================================================
-- Done
-- ============================================================
SELECT 'Migration 20260730_fix_all_production_errors completed!' AS result;
