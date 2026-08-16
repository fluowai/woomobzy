-- ============================================================================
-- Migration: Add missing columns to rental_contracts
-- Date: 2026-08-04
-- Purpose: Align rental_contracts to the full schema defined in
--          20260803_lease_schema_alignment.sql / 20260730_fix_all_production_errors.sql
-- Safe to run multiple times (idempotent).
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_cpf') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_cpf TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_rg') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_rg TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_type') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_type TEXT CHECK (tenant_type IN ('PF', 'PJ'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_birth_date') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_birth_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_marital_status') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_marital_status TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_profession') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_profession TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_employer') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_employer TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_monthly_income') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_monthly_income NUMERIC(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_address') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_city') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_city TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_state') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_state TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_zip') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_zip TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'emergency_contact_name') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN emergency_contact_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'emergency_contact_phone') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN emergency_contact_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'reference_1_name') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN reference_1_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'reference_1_phone') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN reference_1_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'reference_2_name') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN reference_2_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'reference_2_phone') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN reference_2_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantee_document') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN guarantee_document TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'deposit_caucao_amount') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN deposit_caucao_amount NUMERIC(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'insurance_company') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN insurance_company TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'insurance_policy_number') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN insurance_policy_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'late_fee_percent') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN late_fee_percent NUMERIC(5,2) DEFAULT 2.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'late_interest_percent') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN late_interest_percent NUMERIC(8,5) DEFAULT 0.03333;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'notes') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'evaluation_score') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN evaluation_score INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'evaluation_status') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN evaluation_status TEXT DEFAULT 'em_analise';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'credit_score') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN credit_score INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'has_restrictions') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN has_restrictions BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'restriction_notes') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN restriction_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'income_proof_status') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN income_proof_status TEXT DEFAULT 'pendente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantor_name') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN guarantor_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantor_cpf') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN guarantor_cpf TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantor_phone') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN guarantor_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantor_monthly_income') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN guarantor_monthly_income NUMERIC(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'recommended_limit') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN recommended_limit NUMERIC(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'analysis_notes') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN analysis_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'signed_at') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN signed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'activated_at') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN activated_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'terminated_at') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN terminated_at TIMESTAMPTZ;
  END IF;
END $$;

-- Ensure updated_at trigger exists
DROP TRIGGER IF EXISTS on_rental_contracts_updated ON public.rental_contracts;
CREATE TRIGGER on_rental_contracts_updated
  BEFORE UPDATE ON public.rental_contracts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_rental_contracts_org_status ON public.rental_contracts (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_org_created ON public.rental_contracts (organization_id, created_at DESC);

SELECT 'Migration 20260804_add_missing_rental_columns completed!' AS result;
