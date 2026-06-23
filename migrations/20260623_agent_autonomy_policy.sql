-- AI Agent Autonomy Policy + Tool Permissions + Orchestration
-- Transforma agentes de perfis genéricos em máquinas de estado autônomas

ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS autonomy_policy JSONB NOT NULL DEFAULT '{
  "level": 2,
  "permissions": {
    "canCreateLead": true,
    "canMoveKanban": true,
    "canSendMessage": true,
    "canScheduleVisit": false,
    "canMatchProperties": true,
    "canHandoffToHuman": true,
    "maxBudgetValue": 0,
    "requireApproval": ["schedule_visit", "close_deal"]
  }
}'::jsonb;

ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS state_machine JSONB NOT NULL DEFAULT '{
  "current": null,
  "history": []
}'::jsonb;

ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS tool_permissions JSONB NOT NULL DEFAULT '{
  "lead_qualifier": true,
  "property_matcher": true,
  "kanban_mover": true,
  "visit_scheduler": false,
  "document_analyzer": false,
  "followup_creator": true,
  "human_escalator": true,
  "message_sender": true,
  "lead_creator": true,
  "tag_manager": true
}'::jsonb;

CREATE TABLE IF NOT EXISTS agent_handoff_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  to_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  to_human BOOLEAN NOT NULL DEFAULT false,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  session_id TEXT,
  reason TEXT NOT NULL,
  context_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_handoff_org ON agent_handoff_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_handoff_from ON agent_handoff_log(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_handoff_lead ON agent_handoff_log(lead_id);

CREATE TABLE IF NOT EXISTS agent_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  step_id TEXT,
  tool_used TEXT,
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_exec_org ON agent_execution_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_exec_agent ON agent_execution_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_exec_session ON agent_execution_log(session_id);

ALTER TABLE agent_handoff_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on agent_handoff_log" ON agent_handoff_log
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on agent_execution_log" ON agent_execution_log
  FOR ALL USING (true) WITH CHECK (true);
