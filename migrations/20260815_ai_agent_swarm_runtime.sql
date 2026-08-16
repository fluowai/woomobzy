-- Runtime seguro para agentes autônomos e equipes multiagente.
-- Mantém estado estruturado da conversa, idempotência de ferramentas e traces
-- sanitizados sem expor as tabelas diretamente ao cliente.

CREATE TABLE IF NOT EXISTS ai_conversation_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  primary_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  facts JSONB NOT NULL DEFAULT '{}'::jsonb,
  answered_fields TEXT[] NOT NULL DEFAULT '{}',
  asked_questions TEXT[] NOT NULL DEFAULT '{}',
  presented_property_ids UUID[] NOT NULL DEFAULT '{}',
  active_intents TEXT[] NOT NULL DEFAULT '{}',
  open_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_specialist_ids UUID[] NOT NULL DEFAULT '{}',
  conversation_summary TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  retention_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_states_agent
  ON ai_conversation_states(organization_id, primary_agent_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_states_lead
  ON ai_conversation_states(organization_id, lead_id, updated_at DESC)
  WHERE lead_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS ai_tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id TEXT,
  primary_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  specialist_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  arguments_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started'
    CHECK (status IN ('started', 'completed', 'failed', 'denied')),
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_class TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_tool_executions_session
  ON ai_tool_executions(organization_id, session_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_tool_executions_lead
  ON ai_tool_executions(organization_id, lead_id, started_at DESC)
  WHERE lead_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS ai_execution_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  request_id UUID NOT NULL DEFAULT gen_random_uuid(),
  session_id TEXT,
  primary_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  provider TEXT,
  model TEXT,
  prompt_version TEXT NOT NULL DEFAULT 'imobzy-swarm-v2',
  status TEXT NOT NULL DEFAULT 'started'
    CHECK (status IN ('started', 'completed', 'partial', 'failed', 'denied')),
  route_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  specialist_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  tool_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  error_class TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (organization_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_execution_traces_session
  ON ai_execution_traces(organization_id, session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_execution_traces_agent
  ON ai_execution_traces(organization_id, primary_agent_id, created_at DESC);

-- Última barreira contra dois agendamentos concorrentes no mesmo slot. O lock
-- transacional evita corrida e, diferente de um índice único novo, não falha a
-- migration caso existam dados históricos duplicados para saneamento posterior.
CREATE OR REPLACE FUNCTION guard_active_appointment_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  slot_key TEXT;
BEGIN
  IF lower(COALESCE(NEW.status, 'pending')) IN ('canceled', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF NEW.agenda_id IS NULL AND NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  slot_key := concat_ws(
    '|',
    NEW.organization_id::text,
    COALESCE(NEW.agenda_id::text, ''),
    COALESCE(NEW.user_id::text, ''),
    NEW.appointment_date::text
  );
  PERFORM pg_advisory_xact_lock(hashtext(NEW.organization_id::text), hashtext(slot_key));

  IF EXISTS (
    SELECT 1
    FROM lead_appointments existing
    WHERE existing.organization_id = NEW.organization_id
      AND existing.id IS DISTINCT FROM NEW.id
      AND existing.appointment_date = NEW.appointment_date
      AND lower(COALESCE(existing.status, 'pending')) NOT IN ('canceled', 'cancelled')
      AND (
        (NEW.agenda_id IS NOT NULL AND existing.agenda_id = NEW.agenda_id)
        OR (NEW.user_id IS NOT NULL AND existing.user_id = NEW.user_id)
      )
  ) THEN
    RAISE EXCEPTION 'Horário já ocupado para esta agenda ou corretor.'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_active_appointment_slot ON lead_appointments;
CREATE TRIGGER trg_guard_active_appointment_slot
  BEFORE INSERT OR UPDATE OF organization_id, agenda_id, user_id, appointment_date, status
  ON lead_appointments
  FOR EACH ROW EXECUTE FUNCTION guard_active_appointment_slot();

ALTER TABLE conversation_memory
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ
  DEFAULT (now() + INTERVAL '180 days');

ALTER TABLE agent_learning
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ
  DEFAULT (now() + INTERVAL '180 days');

CREATE INDEX IF NOT EXISTS idx_conversation_memory_retention
  ON conversation_memory(retention_until)
  WHERE retention_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_learning_retention
  ON agent_learning(retention_until)
  WHERE retention_until IS NOT NULL;

CREATE OR REPLACE FUNCTION purge_expired_ai_runtime_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
  affected INTEGER := 0;
BEGIN
  DELETE FROM conversation_memory
  WHERE retention_until IS NOT NULL AND retention_until < now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted_count := deleted_count + affected;

  DELETE FROM agent_learning
  WHERE retention_until IS NOT NULL AND retention_until < now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted_count := deleted_count + affected;

  DELETE FROM ai_conversation_states
  WHERE retention_until IS NOT NULL AND retention_until < now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted_count := deleted_count + affected;

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION purge_expired_ai_runtime_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_expired_ai_runtime_data() TO service_role;

ALTER TABLE ai_conversation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_execution_traces ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE ai_conversation_states TO service_role;
GRANT ALL ON TABLE ai_tool_executions TO service_role;
GRANT ALL ON TABLE ai_execution_traces TO service_role;

-- Corrige policies legadas que tinham USING (true) sem limitar o papel e,
-- portanto, não isolavam tenants para clientes autenticados.
DROP POLICY IF EXISTS "Service role full access on ai_agents" ON ai_agents;
DROP POLICY IF EXISTS "Service role full access on lead_tags" ON lead_tags;
DROP POLICY IF EXISTS "Service role full access on lead_followups" ON lead_followups;
DROP POLICY IF EXISTS "Service role full access on conversation_memory" ON conversation_memory;
DROP POLICY IF EXISTS "Service role full access on agent_qualifications" ON agent_qualifications;
DROP POLICY IF EXISTS "Service role full access on agent_learning" ON agent_learning;

CREATE POLICY "Service role full access on ai_agents" ON ai_agents
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on lead_tags" ON lead_tags
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on lead_followups" ON lead_followups
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on conversation_memory" ON conversation_memory
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on agent_qualifications" ON agent_qualifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on agent_learning" ON agent_learning
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE ai_conversation_states IS
  'Memória estruturada por tenant e sessão para evitar perguntas repetidas e preservar continuidade entre especialistas.';
COMMENT ON TABLE ai_tool_executions IS
  'Ledger idempotente de ferramentas executadas por agentes; não armazena prompts completos.';
COMMENT ON TABLE ai_execution_traces IS
  'Observabilidade sanitizada do roteamento multiagente, sem conteúdo bruto da conversa.';
