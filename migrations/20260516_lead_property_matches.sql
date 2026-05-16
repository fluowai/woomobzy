ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS matched_properties JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS match_summary TEXT,
  ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_matched_at
  ON leads(matched_at);
