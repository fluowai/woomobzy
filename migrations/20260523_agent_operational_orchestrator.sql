-- Central de Agentes Operacionais 360
-- Estrutura normalizada para evoluir ai_agents de cadastro simples para orquestrador operacional.

ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Rascunho',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS operation_mode TEXT DEFAULT 'Copiloto humano',
  ADD COLUMN IF NOT EXISTS autonomy_level INTEGER DEFAULT 2 CHECK (autonomy_level BETWEEN 1 AND 5);

CREATE TABLE IF NOT EXISTS public.agent_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,
  instance_id TEXT,
  can_read BOOLEAN NOT NULL DEFAULT true,
  can_reply BOOLEAN NOT NULL DEFAULT false,
  can_suggest BOOLEAN NOT NULL DEFAULT true,
  can_apply_tags BOOLEAN NOT NULL DEFAULT true,
  can_create_lead BOOLEAN NOT NULL DEFAULT false,
  can_transfer BOOLEAN NOT NULL DEFAULT true,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  workspace_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, workspace_type)
);

CREATE TABLE IF NOT EXISTS public.agent_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, permission_key)
);

CREATE TABLE IF NOT EXISTS public.agent_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  pipeline_id TEXT NOT NULL,
  allowed_stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocked_stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  can_create_card BOOLEAN NOT NULL DEFAULT false,
  can_move_card BOOLEAN NOT NULL DEFAULT false,
  can_create_task BOOLEAN NOT NULL DEFAULT false,
  can_define_loss_reason BOOLEAN NOT NULL DEFAULT false,
  default_human_owner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT,
  priority INTEGER NOT NULL DEFAULT 5,
  active BOOLEAN NOT NULL DEFAULT true,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_handoff_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  condition_type TEXT NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  destination_type TEXT,
  destination_id TEXT,
  action_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_metrics_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  target_value NUMERIC,
  period TEXT DEFAULT 'monthly',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, metric_key)
);

CREATE TABLE IF NOT EXISTS public.agent_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  simulated_message TEXT NOT NULL,
  simulated_channel TEXT,
  simulated_instance_id TEXT,
  simulated_stage TEXT,
  ai_response TEXT,
  predicted_actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  handoff_prediction_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  channel TEXT,
  instance_id TEXT,
  conversation_id TEXT,
  lead_id UUID,
  input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped', 'waiting_approval', 'transferred_to_human')),
  error_message TEXT,
  required_human_approval BOOLEAN NOT NULL DEFAULT false,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_channels_tenant_agent ON public.agent_channels(tenant_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_workspaces_tenant_agent ON public.agent_workspaces(tenant_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_triggers_tenant_agent ON public.agent_triggers(tenant_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_permissions_tenant_agent ON public.agent_permissions(tenant_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_tenant_agent ON public.agent_execution_logs(tenant_id, agent_id, executed_at DESC);

ALTER TABLE public.agent_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_handoff_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_metrics_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on agent_channels" ON public.agent_channels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on agent_workspaces" ON public.agent_workspaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on agent_triggers" ON public.agent_triggers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on agent_permissions" ON public.agent_permissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on agent_pipelines" ON public.agent_pipelines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on agent_knowledge_sources" ON public.agent_knowledge_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on agent_handoff_rules" ON public.agent_handoff_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on agent_metrics_config" ON public.agent_metrics_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on agent_simulations" ON public.agent_simulations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on agent_execution_logs" ON public.agent_execution_logs FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
