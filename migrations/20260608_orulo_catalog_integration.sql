ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_updated_at TEXT,
  ADD COLUMN IF NOT EXISTS external_listing_status TEXT,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_org_source_external
  ON public.properties (organization_id, source, external_id)
  WHERE source IS NOT NULL AND external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_orulo_review
  ON public.properties (organization_id, source, status, imported_at DESC)
  WHERE source = 'orulo';
