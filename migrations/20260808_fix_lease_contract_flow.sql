-- ============================================================================
-- Migration: Fix lease contract flow (persist wizard fields + documents)
-- Date: 2026-08-08
-- Purpose: rental_contracts lacked columns used by the lease wizard and by
--          contract generation (owner data, contract duration, guarantee value,
--          property denormalized fields, signature method, uploaded documents).
--          Without them the wizard data never persisted -> contract always showed
--          "17 variáveis obrigatórias não preenchidas" and no signature link.
-- Safe to run multiple times (idempotent).
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'owner_id') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN owner_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'owner_name') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN owner_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'owner_cpf_cnpj') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN owner_cpf_cnpj TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'owner_email') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN owner_email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'owner_phone') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN owner_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'owner_address_zip') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN owner_address_zip TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'commission_percent') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN commission_percent NUMERIC(5,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'commission_payer') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN commission_payer TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantee_value') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN guarantee_value NUMERIC(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'caution_amount') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN caution_amount NUMERIC(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'caution_payment_date') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN caution_payment_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'contract_duration_months') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN contract_duration_months INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'occupation_date') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN occupation_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'property_title') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN property_title TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'property_address') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN property_address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'property_city') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN property_city TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'property_state') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN property_state TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_employer_phone') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_employer_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_previous_landlord') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_previous_landlord TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_previous_landlord_phone') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_previous_landlord_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_address_street') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_address_street TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_address_number') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_address_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_address_complement') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_address_complement TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_address_neighborhood') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_address_neighborhood TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantor_email') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN guarantor_email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantor_spouse_name') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN guarantor_spouse_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'guarantor_spouse_cpf') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN guarantor_spouse_cpf TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'witness_1_name') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN witness_1_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'witness_1_cpf') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN witness_1_cpf TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'witness_2_name') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN witness_2_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'witness_2_cpf') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN witness_2_cpf TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'co_tenants') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN co_tenants JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'current_template_id') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN current_template_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'signature_method') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN signature_method TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'signature_status') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN signature_status TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'signed_document_url') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN signed_document_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'rental_purpose') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN rental_purpose TEXT DEFAULT 'residencial';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'currency_correction') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN currency_correction BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'adjustment_period_months') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN adjustment_period_months INTEGER DEFAULT 12;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'documents') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN documents JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'condominium_fee') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN condominium_fee NUMERIC(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'iptu_amount') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN iptu_amount NUMERIC(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'tenant_address_zip') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN tenant_address_zip TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'created_by') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN created_by UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'updated_by') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN updated_by UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'contract_number') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN contract_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'last_rent_adjustment') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN last_rent_adjustment DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rental_contracts' AND column_name = 'next_rent_adjustment') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN next_rent_adjustment DATE;
  END IF;
END $$;

SELECT 'Migration 20260808_fix_lease_contract_flow completed!' AS result;
