-- ============================================================
-- SCRIPT COMPLETO: Criar tabelas faltantes e policies RLS
-- Executar no Supabase SQL Editor (https://app.supabase.com/ → SQL Editor)
-- ============================================================

-- 1. Garantir que tabela ai_execution_logs existe (caso ainda não tenha sido criado totalmente)
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

-- Índices da tabela ai_execution_logs
CREATE INDEX IF NOT EXISTS idx_ai_execution_logs_agent_created ON ai_execution_logs(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_execution_logs_org_created ON ai_execution_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_execution_logs_conv ON ai_execution_logs(conversation_id);

-- Habilitar RLS e policies da tabela ai_execution_logs
ALTER TABLE ai_execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_ai_execution_logs" ON ai_execution_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "tenant_ai_execution_logs" ON ai_execution_logs FOR ALL USING (organization_id = get_my_org_id()) WITH CHECK (organization_id = get_my_org_id());

-- 2. Corrigir tabela properties (erro 401)
-- Habilitar RLS se não estiver habilitado
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
-- Policy para service_role ter acesso total
CREATE POLICY service_role_all_properties ON properties FOR ALL USING (true) WITH CHECK (true);

-- 3. Verificar/criar tabela ai_operations (caso esteja incompleta)
-- Esta tabela já deve existir das migrations anteriores, mas verificamos:
-- (As migrations v13 e v14 já a criaram; se faltar, criar abaixo):
-- CREATE TABLE IF NOT EXISTS ai_operations ( ... );

-- 4. Verificar policies de outras tables críticas do AI
-- Garantir que as tables de AI tenham policies consistentes

-- ============================================================
-- Após executar este script, rodar:
--   npm run run-migrations
--   npm run check-db
-- ============================================================