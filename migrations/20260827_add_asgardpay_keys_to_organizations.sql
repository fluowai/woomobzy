-- Migration: Add AsgardPay keys to organizations table
-- Adds columns for per-organization AsgardPay Public Key and Secret Key
-- These are used by the AsgardPay service for organization-specific payments

DO $$
BEGIN
  -- Add asgardpay_public_key column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'asgardpay_public_key') THEN
    ALTER TABLE public.organizations ADD COLUMN asgardpay_public_key TEXT;
  END IF;

  -- Add asgardpay_secret_key column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'asgardpay_secret_key') THEN
    ALTER TABLE public.organizations ADD COLUMN asgardpay_secret_key TEXT;
  END IF;

  NOTIFY pgrst, 'reload schema';
END $$;