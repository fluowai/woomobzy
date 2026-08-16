-- ============================================================================
-- Migration: Add missing Asaas columns for rental/owner workflows
-- Date: 2026-08-08
-- Purpose: Fix runtime errors when generating rental invoices with split and
--          owner wallet lookup. These columns are referenced in
--          server/api/locacao/invoice.routes.js but did not exist in DB.
-- Safe to run multiple times (idempotent).
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'rental_contracts'
      AND column_name = 'asaas_customer_id'
  ) THEN
    ALTER TABLE public.rental_contracts
      ADD COLUMN asaas_customer_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'contacts'
      AND column_name = 'asaas_wallet_id'
  ) THEN
    ALTER TABLE public.contacts
      ADD COLUMN asaas_wallet_id text;
  END IF;
END $$;

-- Optional: help queries that search by these ids
CREATE INDEX IF NOT EXISTS idx_rental_contracts_asaas_customer_id
  ON public.rental_contracts (asaas_customer_id);

CREATE INDEX IF NOT EXISTS idx_contacts_asaas_wallet_id
  ON public.contacts (asaas_wallet_id);

SELECT 'Migration 20260808_asaas_rental_owner_columns completed!' AS result;
