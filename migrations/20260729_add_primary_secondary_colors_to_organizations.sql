-- Add branding columns to organizations table so direct SELECT queries don't 400.
-- These were part of the FIXED schema but no ALTER TABLE migration existed.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#064e3b',
  ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#d4af37';

NOTIFY pgrst, 'reload schema';
