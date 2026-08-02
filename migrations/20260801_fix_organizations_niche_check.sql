-- Allow 'both' (Ambos: Urbano + Rural) as a valid niche value.
-- Mega Admin (server/routes/mega-admin.js) normalizes "Ambos" to 'both',
-- which violated the previous check constraint and caused 500 on save.
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_niche_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_niche_check
  CHECK (niche IN ('rural', 'traditional', 'hybrid', 'urbano', 'both'));

NOTIFY pgrst, 'reload schema';
