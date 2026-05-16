-- AI agents and WhatsApp CRM automation support

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'whatsapp_instances_tenant_id_fkey'
      AND table_name = 'whatsapp_instances'
  ) THEN
    ALTER TABLE whatsapp_instances DROP CONSTRAINT whatsapp_instances_tenant_id_fkey;
  END IF;
END $$;

ALTER TABLE whatsapp_instances
  ADD CONSTRAINT whatsapp_instances_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Atendimento',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  is_active BOOLEAN NOT NULL DEFAULT true,
  personality TEXT,
  instructions TEXT,
  handoff_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  tools TEXT[] NOT NULL DEFAULT '{}',
  response_style TEXT NOT NULL DEFAULT 'consultivo',
  working_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_org ON ai_agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active ON ai_agents(organization_id, is_active);

CREATE TABLE IF NOT EXISTS lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_lead_tags_org ON lead_tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead ON lead_tags(lead_id);

CREATE TABLE IF NOT EXISTS lead_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_followups_org_due ON lead_followups(organization_id, due_at);
CREATE INDEX IF NOT EXISTS idx_lead_followups_lead ON lead_followups(lead_id);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS chat_jid TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget NUMERIC(20,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS matched_properties JSONB DEFAULT '[]'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS match_summary TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;

ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ai_agents" ON ai_agents
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on lead_tags" ON lead_tags
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on lead_followups" ON lead_followups
  FOR ALL USING (true) WITH CHECK (true);
