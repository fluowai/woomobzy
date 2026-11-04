-- AI Agent Orchestration - lead scoring, next actions and visit scheduling

ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_profile JSONB DEFAULT '{}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_next_action TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_last_intent TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_last_confidence NUMERIC(4,3);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_visit_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_org_score
  ON leads(organization_id, lead_score DESC);

CREATE INDEX IF NOT EXISTS idx_leads_org_next_follow_up
  ON leads(organization_id, next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_org_next_visit
  ON leads(organization_id, next_visit_at)
  WHERE next_visit_at IS NOT NULL;

ALTER TABLE lead_followups ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'follow_up';
ALTER TABLE lead_followups ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
