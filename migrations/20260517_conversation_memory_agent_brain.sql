-- Conversation Memory + Neural Brain for AI Agents
-- Evita que agentes repitam perguntas e permite qualifica-los

CREATE TABLE IF NOT EXISTS conversation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_memory_session ON conversation_memory(organization_id, session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conv_memory_agent ON conversation_memory(organization_id, agent_id, created_at);

CREATE TABLE IF NOT EXISTS agent_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  session_id TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_qualifications_agent ON agent_qualifications(organization_id, agent_id);

CREATE TABLE IF NOT EXISTS agent_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  output_text TEXT NOT NULL,
  was_helpful BOOLEAN,
  corrected_output TEXT,
  tags TEXT[] DEFAULT '{}',
  learning_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_learning_agent ON agent_learning(organization_id, agent_id);

ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on conversation_memory" ON conversation_memory
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on agent_qualifications" ON agent_qualifications
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on agent_learning" ON agent_learning
  FOR ALL USING (true) WITH CHECK (true);
