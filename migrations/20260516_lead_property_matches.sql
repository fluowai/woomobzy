ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS matched_properties JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS match_summary TEXT,
  ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS budget NUMERIC(20,2),
  ADD COLUMN IF NOT EXISTS aptitude_interest TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS classification TEXT,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_matched_at
  ON leads(matched_at);
