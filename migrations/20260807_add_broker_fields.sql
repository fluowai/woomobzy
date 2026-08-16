-- Migration: Add broker fields to profiles
-- Date: 2026-08-07

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS creci text,
ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_info jsonb DEFAULT '{}'::jsonb;

-- Update existing profiles that are brokers to have basic default structure if null
UPDATE public.profiles
SET payment_info = '{}'::jsonb
WHERE role = 'broker' AND payment_info IS NULL;
