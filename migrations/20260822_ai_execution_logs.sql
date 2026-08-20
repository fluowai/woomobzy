-- ai_execution_logs: observability table for AI agent executions
-- Used by the operation metrics endpoint (GET /api/ai/operations/:id/metrics).

CREATE TABLE IF NOT EXISTS ai_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  operation_id UUID REFERENCES ai_operations(id) ON DELETE SET NULL,
  conversation_id TEXT,
  channel TEXT,
  instance_id UUID,
  event_type TEXT NOT NULL DEFAULT 'MESSAGE',
  status TEXT NOT NULL DEFAULT 'success',
  latency_ms INTEGER,
  tokens INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  model TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_execution_logs_agent_created
  ON ai_execution_logs(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_execution_logs_org_created
  ON ai_execution_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_execution_logs_conv
  ON ai_execution_logs(conversation_id);

ALTER TABLE ai_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_ai_execution_logs"
  ON ai_execution_logs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "tenant_ai_execution_logs" ON ai_execution_logs
  FOR ALL USING (organization_id = get_my_org_id()) WITH CHECK (organization_id = get_my_org_id());