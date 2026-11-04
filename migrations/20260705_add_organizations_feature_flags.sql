-- Add tenant-level feature flags used by the superadmin feature flag panel.
-- This migration is intentionally narrow and idempotent.

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organizations.feature_flags
IS 'Per-organization feature toggles managed by the superadmin panel.';

NOTIFY pgrst, 'reload schema';
