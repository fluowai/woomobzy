-- ============================================================================
-- Migration: Lease Schema Alignment
-- Date: 2026-08-03
-- Purpose: Align lease schema to use rental_contracts as the canonical table
-- ============================================================================

-- ============================================================
-- 1. Ensure rental_contracts exists with all required columns
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

-- ============================================================
-- 2. If leases table exists and is empty, drop it
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leases') THEN
    IF NOT EXISTS (SELECT 1 FROM leases LIMIT 1) THEN
      DROP TABLE leases CASCADE;
    END IF;
  END IF;
END $$;

-- ============================================================
-- 3. Ensure lease_history references rental_contracts
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
-- 4. RLS for rental_contracts
-- ============================================================
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
-- Done
-- ============================================================
SELECT 'Migration 20260803_lease_schema_alignment completed!' AS result;
