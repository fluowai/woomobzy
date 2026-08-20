-- AI Workforce Builder - Complete Schema Migration
-- Replaces template-based agent system with AI-driven multi-agent workforce builder

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE ai_segment AS ENUM (
  'URBAN_REAL_ESTATE',
  'RURAL_REAL_ESTATE',
  'DEVELOPER',
  'BUILDER',
  'LAND_DEVELOPER'
);

CREATE TYPE ai_operation_status AS ENUM (
  'DRAFT',
  'ARCHITECTURE_DESIGN',
  'CONFIGURING',
  'TESTING',
  'APPROVED',
  'PUBLISHED',
  'PAUSED',
  'ARCHIVED'
);

CREATE TYPE ai_agent_type AS ENUM (
  'ORCHESTRATOR',
  'SPECIALIST',
  'WORKER',
  'SUPERVISOR',
  'FOLLOW_UP',
  'ANALYTICS'
);

CREATE TYPE ai_agent_status AS ENUM (
  'DRAFT',
  'TESTING',
  'APPROVED',
  'PUBLISHED',
  'PAUSED',
  'ARCHIVED',
  'ERROR'
);

CREATE TYPE ai_health_status AS ENUM (
  'EXCELLENT',
  'GOOD',
  'ATTENTION',
  'CRITICAL',
  'UNKNOWN'
);

CREATE TYPE ai_tool_handler_type AS ENUM (
  'SUPABASE_RPC',
  'SUPABASE_QUERY',
  'HTTP_WEBHOOK',
  'INTERNAL_FUNCTION',
  'EXTERNAL_API'
);

CREATE TYPE ai_conversation_status AS ENUM (
  'ACTIVE',
  'PAUSED_BY_HUMAN',
  'HANDOFF_PENDING',
  'CLOSED',
  'ERROR'
);

CREATE TYPE ai_slot_data_type AS ENUM (
  'STRING',
  'NUMBER',
  'BOOLEAN',
  'DATE',
  'ENUM',
  'JSON'
);

CREATE TYPE ai_handoff_trigger AS ENUM (
  'INTENT_CHANGE',
  'SLOT_COMPLETE',
  'SCORE_THRESHOLD',
  'USER_REQUEST',
  'ERROR',
  'LOW_CONFIDENCE',
  'NEGOTIATION',
  'LEGAL_ISSUE',
  'TOOL_FAILURE',
  'SCHEDULED',
  'CUSTOM'
);

CREATE TYPE ai_test_category AS ENUM (
  'HAPPY_PATH',
  'REPEATED_QUESTIONS',
  'CONFUSED_USER',
  'INTENT_CHANGE',
  'ANGRY_USER',
  'INCOMPLETE_DATA',
  'CONTRADICTORY_DATA',
  'INTERNAL_INFO_ATTEMPT',
  'PROMPT_INJECTION',
  'HUMAN_REQUEST',
  'UNKNOWN_PROPERTY',
  'UNKNOWN_PRICE',
  'TOOL_UNAVAILABLE',
  'TIMEOUT',
  'CRM_UNAVAILABLE',
  'EMPTY_MESSAGE',
  'AUDIO_INPUT',
  'IMAGE_INPUT',
  'DOCUMENT_INPUT',
  'SHORT_RESPONSE',
  'LONG_CONVERSATION'
);

CREATE TYPE ai_test_status AS ENUM (
  'PENDING',
  'RUNNING',
  'PASSED',
  'FAILED',
  'ERROR'
);

CREATE TYPE ai_red_team_category AS ENUM (
  'SECURITY',
  'CONSISTENCY',
  'REPETITION',
  'HALLUCINATION',
  'TOOL_MISUSE',
  'DATA_EXPOSURE',
  'LOOPS',
  'HANDOFF_FAILURE',
  'OUT_OF_SCOPE',
  'PROMPT_INJECTION'
);

CREATE TYPE ai_red_team_severity AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE ai_red_team_status AS ENUM (
  'OPEN',
  'FIXED',
  'WONT_FIX',
  'FALSE_POSITIVE'
);

CREATE TYPE ai_knowledge_source_type AS ENUM (
  'DOCUMENT',
  'FAQ',
  'POLICY',
  'MANUAL',
  'CONTRACT_TEMPLATE',
  'PROPERTY_DATA',
  'PROCESS_DOC',
  'EXTERNAL_API',
  'WEBSITE'
);

CREATE TYPE ai_workflow_trigger AS ENUM (
  'NEW_LEAD',
  'INTENT_DETECTED',
  'LEAD_QUALIFIED',
  'PROPERTY_REQUESTED',
  'VISIT_REQUESTED',
  'VISIT_SCHEDULED',
  'HANDOFF_REQUESTED',
  'CONVERSATION_CLOSED',
  'SCHEDULED',
  'MANUAL',
  'WEBHOOK'
);

CREATE TYPE ai_audit_actor_type AS ENUM (
  'USER',
  'SYSTEM',
  'AI'
);

-- ============================================================
-- CORE TABLES
-- ============================================================

-- AI Operations (represents a complete workforce/team)
CREATE TABLE IF NOT EXISTS ai_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  segment ai_segment NOT NULL,
  business_model JSONB NOT NULL DEFAULT '{}',
  objectives TEXT[] NOT NULL DEFAULT '{}',
  status ai_operation_status NOT NULL DEFAULT 'DRAFT',
  architecture JSONB,
  health_score INTEGER DEFAULT 0 CHECK (health_score >= 0 AND health_score <= 100),
  last_tested_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agents (multi-agent architecture)
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES ai_operations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type ai_agent_type NOT NULL DEFAULT 'SPECIALIST',
  role TEXT NOT NULL,
  description TEXT,
  status ai_agent_status NOT NULL DEFAULT 'DRAFT',
  active_version_id UUID,  -- Will reference ai_agent_versions after creation
  channel_config JSONB NOT NULL DEFAULT '{}',
  health_status ai_health_status DEFAULT 'UNKNOWN',
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent Versions (immutable, full configuration snapshot)
CREATE TABLE IF NOT EXISTS ai_agent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  prompt JSONB NOT NULL,
  model TEXT NOT NULL,
  model_config JSONB NOT NULL DEFAULT '{}',
  tools JSONB NOT NULL DEFAULT '[]',
  permissions JSONB NOT NULL DEFAULT '[]',
  guardrails JSONB NOT NULL DEFAULT '{}',
  handoff_config JSONB NOT NULL DEFAULT '{}',
  memory_config JSONB NOT NULL DEFAULT '{}',
  workflow_config JSONB NOT NULL DEFAULT '{}',
  test_results JSONB,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, version)
);

-- Add FK from ai_agents to active_version
ALTER TABLE ai_agents
ADD CONSTRAINT fk_ai_agents_active_version
FOREIGN KEY (active_version_id) REFERENCES ai_agent_versions(id) ON DELETE SET NULL;

-- Tool Registry (centralized tool definitions)
CREATE TABLE IF NOT EXISTS ai_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  input_schema JSONB NOT NULL,
  output_schema JSONB,
  handler_type ai_tool_handler_type NOT NULL,
  handler_config JSONB NOT NULL DEFAULT '{}',
  requires_approval BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Agent-Tool Permissions (least privilege)
CREATE TABLE IF NOT EXISTS ai_agent_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_version_id UUID NOT NULL REFERENCES ai_agent_versions(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  config_override JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_version_id, tool_id)
);

-- Conversation State (structured per conversation)
CREATE TABLE IF NOT EXISTS ai_conversation_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  instance_id UUID,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  current_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  intent TEXT,
  intent_confidence NUMERIC(4,3),
  slots JSONB NOT NULL DEFAULT '{}',
  context JSONB NOT NULL DEFAULT '{}',
  lead_memory JSONB NOT NULL DEFAULT '{}',
  status ai_conversation_status NOT NULL DEFAULT 'ACTIVE',
  ai_paused_at TIMESTAMPTZ,
  human_owner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, conversation_id)
);

-- Slot Definitions (per intent/segment)
CREATE TABLE IF NOT EXISTS ai_slot_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  segment ai_segment,
  intent TEXT NOT NULL,
  slot_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  data_type ai_slot_data_type NOT NULL,
  enum_values TEXT[],
  is_required BOOLEAN DEFAULT FALSE,
  is_sensitive BOOLEAN DEFAULT FALSE,
  extraction_prompt TEXT,
  validation_rules JSONB DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, segment, intent, slot_key)
);

-- Handoff Protocols
CREATE TABLE IF NOT EXISTS ai_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  to_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  trigger_type ai_handoff_trigger NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}',
  preserve_context BOOLEAN DEFAULT TRUE,
  summary_template TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Test Cases
CREATE TABLE IF NOT EXISTS ai_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  operation_id UUID REFERENCES ai_operations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  category ai_test_category NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  initial_context JSONB DEFAULT '{}',
  steps JSONB NOT NULL DEFAULT '[]',
  success_criteria JSONB NOT NULL DEFAULT '{}',
  is_ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Test Runs
CREATE TABLE IF NOT EXISTS ai_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES ai_test_cases(id) ON DELETE CASCADE,
  agent_version_id UUID NOT NULL REFERENCES ai_agent_versions(id) ON DELETE CASCADE,
  status ai_test_status NOT NULL DEFAULT 'PENDING',
  score INTEGER CHECK (score >= 0 AND score <= 100),
  results JSONB,
  execution_time_ms INTEGER,
  tokens_used INTEGER,
  estimated_cost NUMERIC(10,4),
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- AI Red Team Results
CREATE TABLE IF NOT EXISTS ai_red_team_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_version_id UUID NOT NULL REFERENCES ai_agent_versions(id) ON DELETE CASCADE,
  category ai_red_team_category NOT NULL,
  severity ai_red_team_severity NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reproduction_steps JSONB,
  evidence JSONB,
  suggested_fix TEXT,
  status ai_red_team_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Channel Routing Rules
CREATE TABLE IF NOT EXISTS ai_channel_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,
  instance_id UUID,
  activation_rules JSONB NOT NULL DEFAULT '{}',
  blocking_rules JSONB NOT NULL DEFAULT '{}',
  schedule JSONB,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Logs (comprehensive)
CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_type ai_audit_actor_type NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge Sources (per tenant, for RAG)
CREATE TABLE IF NOT EXISTS ai_knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  operation_id UUID REFERENCES ai_operations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  source_type ai_knowledge_source_type NOT NULL,
  content JSONB,
  source_config JSONB NOT NULL DEFAULT '{}',
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  chunk_size INTEGER DEFAULT 1000,
  chunk_overlap INTEGER DEFAULT 200,
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent-Knowledge Linking
CREATE TABLE IF NOT EXISTS ai_agent_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_version_id UUID NOT NULL REFERENCES ai_agent_versions(id) ON DELETE CASCADE,
  knowledge_source_id UUID NOT NULL REFERENCES ai_knowledge_sources(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_version_id, knowledge_source_id)
);

-- Workflow Definitions
CREATE TABLE IF NOT EXISTS ai_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES ai_operations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type ai_workflow_trigger NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ai_operations_org ON ai_operations(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_operations_segment ON ai_operations(segment);
CREATE INDEX IF NOT EXISTS idx_ai_operations_status ON ai_operations(status);
CREATE INDEX IF NOT EXISTS idx_ai_operations_created_by ON ai_operations(created_by);

CREATE INDEX IF NOT EXISTS idx_ai_agents_operation ON ai_agents(operation_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_org ON ai_agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(status);
CREATE INDEX IF NOT EXISTS idx_ai_agents_type ON ai_agents(type);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active_version ON ai_agents(active_version_id);

CREATE INDEX IF NOT EXISTS idx_ai_agent_versions_agent ON ai_agent_versions(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_versions_published ON ai_agent_versions(published_at) WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_tools_org ON ai_tools(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_tools_category ON ai_tools(category);
CREATE INDEX IF NOT EXISTS idx_ai_tools_active ON ai_tools(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ai_agent_tools_version ON ai_agent_tools(agent_version_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_tools_tool ON ai_agent_tools(tool_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_states_org ON ai_conversation_states(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_states_conv ON ai_conversation_states(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_states_lead ON ai_conversation_states(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_states_agent ON ai_conversation_states(current_agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_states_status ON ai_conversation_states(status);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_states_channel ON ai_conversation_states(channel);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_states_updated ON ai_conversation_states(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_slot_definitions_org ON ai_slot_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_slot_definitions_segment ON ai_slot_definitions(segment);
CREATE INDEX IF NOT EXISTS idx_ai_slot_definitions_intent ON ai_slot_definitions(intent);

CREATE INDEX IF NOT EXISTS idx_ai_handoffs_org ON ai_handoffs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_handoffs_from ON ai_handoffs(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_handoffs_to ON ai_handoffs(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_handoffs_trigger ON ai_handoffs(trigger_type);

CREATE INDEX IF NOT EXISTS idx_ai_test_cases_operation ON ai_test_cases(operation_id);
CREATE INDEX IF NOT EXISTS idx_ai_test_cases_agent ON ai_test_cases(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_test_cases_category ON ai_test_cases(category);

CREATE INDEX IF NOT EXISTS idx_ai_test_runs_case ON ai_test_runs(test_case_id);
CREATE INDEX IF NOT EXISTS idx_ai_test_runs_version ON ai_test_runs(agent_version_id);
CREATE INDEX IF NOT EXISTS idx_ai_test_runs_status ON ai_test_runs(status);

CREATE INDEX IF NOT EXISTS idx_ai_red_team_version ON ai_red_team_results(agent_version_id);
CREATE INDEX IF NOT EXISTS idx_ai_red_team_category ON ai_red_team_results(category);
CREATE INDEX IF NOT EXISTS idx_ai_red_team_severity ON ai_red_team_results(severity);
CREATE INDEX IF NOT EXISTS idx_ai_red_team_status ON ai_red_team_results(status);

CREATE INDEX IF NOT EXISTS idx_ai_channel_rules_agent ON ai_channel_rules(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_rules_channel ON ai_channel_rules(channel_type);
CREATE INDEX IF NOT EXISTS idx_ai_channel_rules_instance ON ai_channel_rules(instance_id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_rules_active ON ai_channel_rules(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_org ON ai_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_entity ON ai_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_actor ON ai_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_created ON ai_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_sources_org ON ai_knowledge_sources(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_sources_operation ON ai_knowledge_sources(operation_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_sources_type ON ai_knowledge_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_sources_active ON ai_knowledge_sources(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ai_agent_knowledge_version ON ai_agent_knowledge(agent_version_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_knowledge_source ON ai_agent_knowledge(knowledge_source_id);

CREATE INDEX IF NOT EXISTS idx_ai_workflows_operation ON ai_workflows(operation_id);
CREATE INDEX IF NOT EXISTS idx_ai_workflows_trigger ON ai_workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_ai_workflows_active ON ai_workflows(is_active) WHERE is_active = TRUE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE ai_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_slot_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_red_team_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_channel_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_workflows ENABLE ROW LEVEL SECURITY;

-- Service role has full access (backend services)
CREATE POLICY "service_role_all_ai_operations" ON ai_operations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ai_agents" ON ai_agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ai_agent_versions" ON ai_agent_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ai_tools" ON ai_tools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ai_agent_tools" ON ai_agent_tools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ai_conversation_states" ON ai_conversation_states FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ai_slot_definitions" ON ai_slot_definitions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ai_handoffs" ON ai_handoffs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ai_test_cases" ON ai_test_cases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ai_test_runs" ON ai_test_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ai_red_team_results" ON ai_red_team_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ai_channel_rules" ON ai_channel_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ai_audit_logs" ON ai_audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ai_knowledge_sources" ON ai_knowledge_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ai_agent_knowledge" ON ai_agent_knowledge FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ai_workflows" ON ai_workflows FOR ALL USING (true) WITH CHECK (true);

-- Tenant isolation for authenticated users (if needed for direct access)
-- Note: All AI operations go through service role, these are for any direct access
CREATE POLICY "tenant_ai_operations" ON ai_operations
  FOR ALL USING (organization_id = get_my_org_id()) WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "tenant_ai_agents" ON ai_agents
  FOR ALL USING (organization_id = get_my_org_id()) WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "tenant_ai_agent_versions" ON ai_agent_versions
  FOR ALL USING (
    agent_id IN (SELECT id FROM ai_agents WHERE organization_id = get_my_org_id())
  ) WITH CHECK (
    agent_id IN (SELECT id FROM ai_agents WHERE organization_id = get_my_org_id())
  );

CREATE POLICY "tenant_ai_tools" ON ai_tools
  FOR SELECT USING (organization_id = get_my_org_id() OR organization_id IS NULL);

CREATE POLICY "tenant_ai_conversation_states" ON ai_conversation_states
  FOR ALL USING (organization_id = get_my_org_id()) WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "tenant_ai_channel_rules" ON ai_channel_rules
  FOR ALL USING (organization_id = get_my_org_id()) WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "tenant_ai_knowledge_sources" ON ai_knowledge_sources
  FOR ALL USING (organization_id = get_my_org_id()) WITH CHECK (organization_id = get_my_org_id());

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_operations_updated_at BEFORE UPDATE ON ai_operations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_tools_updated_at BEFORE UPDATE ON ai_tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_conversation_states_updated_at BEFORE UPDATE ON ai_conversation_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_channel_rules_updated_at BEFORE UPDATE ON ai_channel_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_knowledge_sources_updated_at BEFORE UPDATE ON ai_knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_workflows_updated_at BEFORE UPDATE ON ai_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DEFAULT GLOBAL TOOLS (Seed Data)
-- ============================================================

-- These are global tools available to all tenants
-- Organization-specific tools can be added per tenant

INSERT INTO ai_tools (organization_id, name, display_name, category, description, input_schema, output_schema, handler_type, handler_config, is_active) VALUES
-- CRM Tools
  (NULL, 'crm.leads.read', 'Consultar Lead', 'CRM', 'Busca informações de um lead no CRM',
   '{"type": "object", "properties": {"lead_id": {"type": "string"}}, "required": ["lead_id"]}',
   '{"type": "object", "properties": {"id": {"type": "string"}, "name": {"type": "string"}, "phone": {"type": "string"}, "email": {"type": "string"}, "status": {"type": "string"}, "budget": {"type": "number"}, "ai_profile": {"type": "object"}}}',
   'SUPABASE_RPC', '{"function": "get_lead_by_id"}', TRUE),

  (NULL, 'crm.leads.create', 'Criar Lead', 'CRM', 'Cria um novo lead no CRM',
   '{"type": "object", "properties": {"name": {"type": "string"}, "phone": {"type": "string"}, "email": {"type": "string"}, "source": {"type": "string"}, "organization_id": {"type": "string"}}, "required": ["name", "organization_id"]}',
   '{"type": "object", "properties": {"id": {"type": "string"}, "created_at": {"type": "string"}}}',
   'SUPABASE_RPC', '{"function": "create_lead"}', TRUE),

  (NULL, 'crm.leads.update', 'Atualizar Lead', 'CRM', 'Atualiza dados de um lead',
   '{"type": "object", "properties": {"lead_id": {"type": "string"}, "data": {"type": "object"}}, "required": ["lead_id", "data"]}',
   '{"type": "object", "properties": {"success": {"type": "boolean"}}}',
   'SUPABASE_RPC', '{"function": "update_lead"}', TRUE),

  (NULL, 'crm.activities.create', 'Criar Atividade', 'CRM', 'Registra atividade/follow-up no CRM',
   '{"type": "object", "properties": {"lead_id": {"type": "string"}, "title": {"type": "string"}, "notes": {"type": "string"}, "due_at": {"type": "string"}, "kind": {"type": "string"}}, "required": ["lead_id", "title", "due_at"]}',
   '{"type": "object", "properties": {"id": {"type": "string"}}}',
   'SUPABASE_RPC', '{"function": "create_followup"}', TRUE),

  (NULL, 'crm.funnel.move', 'Mover Etapa Funil', 'CRM', 'Move lead para outra etapa do funil',
   '{"type": "object", "properties": {"lead_id": {"type": "string"}, "stage": {"type": "string"}}, "required": ["lead_id", "stage"]}',
   '{"type": "object", "properties": {"success": {"type": "boolean"}}}',
   'SUPABASE_RPC', '{"function": "move_lead_stage"}', TRUE),

-- Properties Tools
  (NULL, 'properties.search', 'Buscar Imóveis', 'PROPERTIES', 'Busca imóveis compatíveis com critérios',
   '{"type": "object", "properties": {"tipo": {"type": "string"}, "cidade": {"type": "string"}, "orcamento_maximo": {"type": "number"}, "quartos": {"type": "number"}, "finalidade": {"type": "string"}, "bairro": {"type": "string"}}}',
   '{"type": "object", "properties": {"results": {"type": "array", "items": {"type": "object", "properties": {"id": {"type": "string"}, "title": {"type": "string"}, "price": {"type": "number"}, "city": {"type": "string"}, "bedrooms": {"type": "number"}, "property_type": {"type": "string"}}}}}}',
   'SUPABASE_RPC', '{"function": "search_properties_for_lead"}', TRUE),

  (NULL, 'properties.read', 'Consultar Imóvel', 'PROPERTIES', 'Obtém detalhes completos de um imóvel',
   '{"type": "object", "properties": {"property_id": {"type": "string"}}, "required": ["property_id"]}',
   '{"type": "object"}',
   'SUPABASE_RPC', '{"function": "get_property_details"}', TRUE),

  (NULL, 'properties.availability', 'Consultar Disponibilidade', 'PROPERTIES', 'Verifica disponibilidade de unidades',
   '{"type": "object", "properties": {"property_id": {"type": "string"}, "development_id": {"type": "string"}}}',
   '{"type": "object", "properties": {"available": {"type": "boolean"}, "units": {"type": "array"}}}',
   'SUPABASE_RPC', '{"function": "check_availability"}', TRUE),

-- Calendar Tools
  (NULL, 'calendar.availability', 'Consultar Horários', 'CALENDAR', 'Busca horários disponíveis para agendamento',
   '{"type": "object", "properties": {"date": {"type": "string"}, "broker_id": {"type": "string"}, "duration_minutes": {"type": "number"}}}',
   '{"type": "object", "properties": {"slots": {"type": "array", "items": {"type": "string"}}}}',
   'SUPABASE_RPC', '{"function": "get_available_slots"}', TRUE),

  (NULL, 'calendar.create', 'Agendar Visita', 'CALENDAR', 'Cria agendamento de visita',
   '{"type": "object", "properties": {"lead_id": {"type": "string"}, "property_id": {"type": "string"}, "broker_id": {"type": "string"}, "date_time": {"type": "string"}, "notes": {"type": "string"}}, "required": ["lead_id", "date_time"]}',
   '{"type": "object", "properties": {"appointment_id": {"type": "string"}, "confirmed": {"type": "boolean"}}}',
   'SUPABASE_RPC', '{"function": "schedule_visit"}', TRUE),

  (NULL, 'calendar.update', 'Atualizar Agendamento', 'CALENDAR', 'Atualiza ou cancela agendamento',
   '{"type": "object", "properties": {"appointment_id": {"type": "string"}, "action": {"type": "string", "enum": ["reschedule", "cancel", "confirm"]}, "new_date_time": {"type": "string"}}, "required": ["appointment_id", "action"]}',
   '{"type": "object", "properties": {"success": {"type": "boolean"}}}',
   'SUPABASE_RPC', '{"function": "update_appointment"}', TRUE),

-- Communication Tools
  (NULL, 'messages.send', 'Enviar Mensagem', 'COMMUNICATION', 'Envia mensagem via canal ativo',
   '{"type": "object", "properties": {"conversation_id": {"type": "string"}, "channel": {"type": "string"}, "content": {"type": "string"}, "media_url": {"type": "string"}}, "required": ["conversation_id", "channel", "content"]}',
   '{"type": "object", "properties": {"message_id": {"type": "string"}, "sent": {"type": "boolean"}}}',
   'INTERNAL_FUNCTION', '{"handler": "send_message"}', TRUE),

  (NULL, 'messages.send_audio', 'Enviar Áudio', 'COMMUNICATION', 'Gera e envia áudio via TTS',
   '{"type": "object", "properties": {"conversation_id": {"type": "string"}, "channel": {"type": "string"}, "text": {"type": "string"}}, "required": ["conversation_id", "channel", "text"]}',
   '{"type": "object", "properties": {"audio_url": {"type": "string"}, "duration_ms": {"type": "number"}}}',
   'EXTERNAL_API', '{"provider": "elevenlabs", "endpoint": "text-to-speech"}', TRUE),

-- Financing Tools
  (NULL, 'financing.simulate', 'Simular Financiamento', 'FINANCING', 'Simula financiamento imobiliário',
   '{"type": "object", "properties": {"property_value": {"type": "number"}, "down_payment": {"type": "number"}, "term_months": {"type": "number"}, "interest_rate": {"type": "number"}}, "required": ["property_value", "down_payment", "term_months"]}',
   '{"type": "object", "properties": {"financed_amount": {"type": "number"}, "monthly_payment": {"type": "number"}, "total_interest": {"type": "number"}, "total_paid": {"type": "number"}}}',
   'INTERNAL_FUNCTION', '{"handler": "simulate_financing"}', TRUE),

-- Analytics Tools
  (NULL, 'analytics.lead_score', 'Calcular Score Lead', 'ANALYTICS', 'Calcula score de qualificação do lead',
   '{"type": "object", "properties": {"lead_id": {"type": "string"}}, "required": ["lead_id"]}',
   '{"type": "object", "properties": {"score": {"type": "number"}, "factors": {"type": "object"}}}',
   'SUPABASE_RPC', '{"function": "calculate_lead_score"}', TRUE),

  (NULL, 'analytics.property_match', 'Match de Imóveis', 'ANALYTICS', 'Encontra melhores matches para perfil do lead',
   '{"type": "object", "properties": {"lead_id": {"type": "string"}, "limit": {"type": "number"}}, "required": ["lead_id"]}',
   '{"type": "object", "properties": {"matches": {"type": "array"}}}',
   'SUPABASE_RPC', '{"function": "match_lead_properties"}', TRUE),

-- Document Tools
  (NULL, 'documents.generate', 'Gerar Documento', 'DOCUMENTS', 'Gera documento a partir de template',
   '{"type": "object", "properties": {"template_id": {"type": "string"}, "data": {"type": "object"}}, "required": ["template_id", "data"]}',
   '{"type": "object", "properties": {"document_url": {"type": "string"}, "document_id": {"type": "string"}}}',
   'SUPABASE_RPC', '{"function": "generate_document"}', TRUE),

  (NULL, 'documents.read', 'Ler Documento', 'DOCUMENTS', 'Extrai texto de documento (PDF, DOCX)',
   '{"type": "object", "properties": {"document_id": {"type": "string"}}, "required": ["document_id"]}',
   '{"type": "object", "properties": {"text": {"type": "string"}, "pages": {"type": "number"}}}',
   'SUPABASE_RPC', '{"function": "extract_document_text"}', TRUE)

ON CONFLICT (organization_id, name) DO NOTHING;

-- ============================================================
-- DEFAULT SLOT DEFINITIONS (Global Templates)
-- ============================================================

-- Urban Real Estate - Purchase Intent
INSERT INTO ai_slot_definitions (organization_id, segment, intent, slot_key, label, description, data_type, is_required, display_order) VALUES
  (NULL, 'URBAN_REAL_ESTATE', 'BUY_PROPERTY', 'name', 'Nome', 'Nome completo do cliente', 'STRING', TRUE, 1),
  (NULL, 'URBAN_REAL_ESTATE', 'BUY_PROPERTY', 'phone', 'Telefone', 'Telefone com DDD', 'STRING', TRUE, 2),
  (NULL, 'URBAN_REAL_ESTATE', 'BUY_PROPERTY', 'email', 'E-mail', 'E-mail para contato', 'STRING', FALSE, 3),
  (NULL, 'URBAN_REAL_ESTATE', 'BUY_PROPERTY', 'property_type', 'Tipo de Imóvel', 'Apartamento, Casa, Terreno, etc.', 'ENUM', TRUE, 4),
  (NULL, 'URBAN_REAL_ESTATE', 'BUY_PROPERTY', 'city', 'Cidade', 'Cidade de interesse', 'STRING', TRUE, 5),
  (NULL, 'URBAN_REAL_ESTATE', 'BUY_PROPERTY', 'neighborhoods', 'Bairros', 'Bairros de preferência', 'JSON', FALSE, 6),
  (NULL, 'URBAN_REAL_ESTATE', 'BUY_PROPERTY', 'bedrooms', 'Quartos', 'Número mínimo de quartos', 'NUMBER', TRUE, 7),
  (NULL, 'URBAN_REAL_ESTATE', 'BUY_PROPERTY', 'budget_max', 'Orçamento Máximo', 'Valor máximo para compra', 'NUMBER', TRUE, 8),
  (NULL, 'URBAN_REAL_ESTATE', 'BUY_PROPERTY', 'financing', 'Financiamento', 'Vai financiar?', 'BOOLEAN', TRUE, 9),
  (NULL, 'URBAN_REAL_ESTATE', 'BUY_PROPERTY', 'income', 'Renda', 'Renda familiar mensal', 'NUMBER', FALSE, 10),
  (NULL, 'URBAN_REAL_ESTATE', 'BUY_PROPERTY', 'timeline', 'Prazo', 'Quando pretende comprar', 'STRING', FALSE, 11),
  (NULL, 'URBAN_REAL_ESTATE', 'BUY_PROPERTY', 'visit_requested', 'Visita Solicitada', 'Cliente pediu agendamento', 'BOOLEAN', FALSE, 12)

ON CONFLICT DO NOTHING;

-- Urban Real Estate - Rent Intent
INSERT INTO ai_slot_definitions (organization_id, segment, intent, slot_key, label, description, data_type, is_required, display_order) VALUES
  (NULL, 'URBAN_REAL_ESTATE', 'RENT_PROPERTY', 'name', 'Nome', 'Nome completo do cliente', 'STRING', TRUE, 1),
  (NULL, 'URBAN_REAL_ESTATE', 'RENT_PROPERTY', 'phone', 'Telefone', 'Telefone com DDD', 'STRING', TRUE, 2),
  (NULL, 'URBAN_REAL_ESTATE', 'RENT_PROPERTY', 'property_type', 'Tipo de Imóvel', 'Apartamento, Casa, Kitnet, etc.', 'ENUM', TRUE, 3),
  (NULL, 'URBAN_REAL_ESTATE', 'RENT_PROPERTY', 'city', 'Cidade', 'Cidade de interesse', 'STRING', TRUE, 4),
  (NULL, 'URBAN_REAL_ESTATE', 'RENT_PROPERTY', 'neighborhoods', 'Bairros', 'Bairros de preferência', 'JSON', FALSE, 5),
  (NULL, 'URBAN_REAL_ESTATE', 'RENT_PROPERTY', 'bedrooms', 'Quartos', 'Número mínimo de quartos', 'NUMBER', TRUE, 6),
  (NULL, 'URBAN_REAL_ESTATE', 'RENT_PROPERTY', 'rent_max', 'Aluguel Máximo', 'Valor máximo de aluguel', 'NUMBER', TRUE, 7),
  (NULL, 'URBAN_REAL_ESTATE', 'RENT_PROPERTY', 'move_in_date', 'Data de Mudança', 'Quando precisa do imóvel', 'DATE', TRUE, 8),
  (NULL, 'URBAN_REAL_ESTATE', 'RENT_PROPERTY', 'guarantor_type', 'Tipo de Garantia', 'Fiador, Seguro Fiança, Título Capitalização', 'ENUM', FALSE, 9),
  (NULL, 'URBAN_REAL_ESTATE', 'RENT_PROPERTY', 'pets', 'Animais', 'Possui animais de estimação', 'BOOLEAN', FALSE, 10)

ON CONFLICT DO NOTHING;

-- Rural Real Estate
INSERT INTO ai_slot_definitions (organization_id, segment, intent, slot_key, label, description, data_type, is_required, display_order) VALUES
  (NULL, 'RURAL_REAL_ESTATE', 'BUY_RURAL', 'name', 'Nome', 'Nome completo do cliente', 'STRING', TRUE, 1),
  (NULL, 'RURAL_REAL_ESTATE', 'BUY_RURAL', 'phone', 'Telefone', 'Telefone com DDD', 'STRING', TRUE, 2),
  (NULL, 'RURAL_REAL_ESTATE', 'BUY_RURAL', 'property_type', 'Tipo de Propriedade', 'Fazenda, Sítio, Chácara, Terra Nua', 'ENUM', TRUE, 3),
  (NULL, 'RURAL_REAL_ESTATE', 'BUY_RURAL', 'purpose', 'Finalidade', 'Pecuária, Agricultura, Lazer, Investimento', 'ENUM', TRUE, 4),
  (NULL, 'RURAL_REAL_ESTATE', 'BUY_RURAL', 'state', 'Estado', 'Estado de interesse', 'STRING', TRUE, 5),
  (NULL, 'RURAL_REAL_ESTATE', 'BUY_RURAL', 'municipality', 'Município', 'Município de interesse', 'STRING', FALSE, 6),
  (NULL, 'RURAL_REAL_ESTATE', 'BUY_RURAL', 'area_min_ha', 'Área Mínima (ha)', 'Hectares mínimos', 'NUMBER', TRUE, 7),
  (NULL, 'RURAL_REAL_ESTATE', 'BUY_RURAL', 'area_max_ha', 'Área Máxima (ha)', 'Hectares máximos', 'NUMBER', FALSE, 8),
  (NULL, 'RURAL_REAL_ESTATE', 'BUY_RURAL', 'budget_max', 'Orçamento Máximo', 'Valor máximo', 'NUMBER', TRUE, 9),
  (NULL, 'RURAL_REAL_ESTATE', 'BUY_RURAL', 'topography', 'Topografia', 'Plana, Ondulada, Montanhosa', 'ENUM', FALSE, 10),
  (NULL, 'RURAL_REAL_ESTATE', 'BUY_RURAL', 'water_resources', 'Recursos Hídricos', 'Rios, nascentes, açudes', 'JSON', FALSE, 11),
  (NULL, 'RURAL_REAL_ESTATE', 'BUY_RURAL', 'soil_type', 'Tipo de Solo', 'Latossolo, Argissolo, etc.', 'STRING', FALSE, 12),
  (NULL, 'RURAL_REAL_ESTATE', 'BUY_RURAL', 'car_status', 'CAR', 'Cadastro Ambiental Rural', 'ENUM', FALSE, 13),
  (NULL, 'RURAL_REAL_ESTATE', 'BUY_RURAL', 'documentation', 'Documentação', 'Matrícula, CCIR, ITR, etc.', 'JSON', FALSE, 14)

ON CONFLICT DO NOTHING;

-- Developer (Incorporadora)
INSERT INTO ai_slot_definitions (organization_id, segment, intent, slot_key, label, description, data_type, is_required, display_order) VALUES
  (NULL, 'DEVELOPER', 'BUY_DEVELOPMENT', 'name', 'Nome', 'Nome completo do cliente', 'STRING', TRUE, 1),
  (NULL, 'DEVELOPER', 'BUY_DEVELOPMENT', 'phone', 'Telefone', 'Telefone com DDD', 'STRING', TRUE, 2),
  (NULL, 'DEVELOPER', 'BUY_DEVELOPMENT', 'development_id', 'Empreendimento', 'Empreendimento de interesse', 'STRING', FALSE, 3),
  (NULL, 'DEVELOPER', 'BUY_DEVELOPMENT', 'unit_type', 'Tipo de Unidade', 'Apartamento, Cobertura, Garden, Studio', 'ENUM', TRUE, 4),
  (NULL, 'DEVELOPER', 'BUY_DEVELOPMENT', 'bedrooms', 'Quartos', 'Número de quartos', 'NUMBER', TRUE, 5),
  (NULL, 'DEVELOPER', 'BUY_DEVELOPMENT', 'budget_max', 'Orçamento', 'Faixa de valor', 'NUMBER', TRUE, 6),
  (NULL, 'DEVELOPER', 'BUY_DEVELOPMENT', 'financing', 'Financiamento', 'Direto, Banco, FGTS', 'ENUM', TRUE, 7),
  (NULL, 'DEVELOPER', 'BUY_DEVELOPMENT', 'down_payment', 'Entrada', 'Valor de entrada disponível', 'NUMBER', FALSE, 8),
  (NULL, 'DEVELOPER', 'BUY_DEVELOPMENT', 'stand_visit', 'Visita ao Stand', 'Agendar visita ao decorado', 'BOOLEAN', FALSE, 9)

ON CONFLICT DO NOTHING;

-- Land Developer (Loteadora)
INSERT INTO ai_slot_definitions (organization_id, segment, intent, slot_key, label, description, data_type, is_required, display_order) VALUES
  (NULL, 'LAND_DEVELOPER', 'BUY_LOT', 'name', 'Nome', 'Nome completo do cliente', 'STRING', TRUE, 1),
  (NULL, 'LAND_DEVELOPER', 'BUY_LOT', 'phone', 'Telefone', 'Telefone com DDD', 'STRING', TRUE, 2),
  (NULL, 'LAND_DEVELOPER', 'BUY_LOT', 'development_id', 'Loteamento', 'Loteamento de interesse', 'STRING', FALSE, 3),
  (NULL, 'LAND_DEVELOPER', 'BUY_LOT', 'lot_type', 'Tipo de Lote', 'Residencial, Comercial, Industrial', 'ENUM', TRUE, 4),
  (NULL, 'LAND_DEVELOPER', 'BUY_LOT', 'area_min_m2', 'Área Mínima (m²)', 'Metragem mínima', 'NUMBER', TRUE, 5),
  (NULL, 'LAND_DEVELOPER', 'BUY_LOT', 'area_max_m2', 'Área Máxima (m²)', 'Metragem máxima', 'NUMBER', FALSE, 6),
  (NULL, 'LAND_DEVELOPER', 'BUY_LOT', 'budget_max', 'Orçamento', 'Valor máximo', 'NUMBER', TRUE, 7),
  (NULL, 'LAND_DEVELOPER', 'BUY_LOT', 'financing_type', 'Financiamento', 'Próprio, Banco, Consórcio', 'ENUM', TRUE, 8),
  (NULL, 'LAND_DEVELOPER', 'BUY_LOT', 'down_payment_pct', 'Entrada (%)', 'Percentual de entrada', 'NUMBER', FALSE, 9),
  (NULL, 'LAND_DEVELOPER', 'BUY_LOT', 'block_preference', 'Quadra', 'Quadra de preferência', 'STRING', FALSE, 10)

ON CONFLICT DO NOTHING;

-- ============================================================
-- MIGRATION: Map existing ai_agents to new structure
-- ============================================================

-- Create operations from existing agents (group by organization)
-- This will be run as a separate data migration script
-- See: migrations/data/20260820_migrate_ai_agents_to_operations.sql

-- ============================================================
-- NOTIFY FOR SCHEMA RELOAD
-- ============================================================

NOTIFY pgrst, 'reload schema';