-- IMOBZY AI Core self-hosted models, usage, credits and RAG metadata

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  commercial_name TEXT,
  provider TEXT NOT NULL DEFAULT 'local',
  engine TEXT NOT NULL CHECK (engine IN ('ollama', 'litellm', 'vllm', 'llama.cpp', 'tgi', 'sglang', 'transformers', 'external')),
  endpoint TEXT NOT NULL,
  model_id TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'chat' CHECK (purpose IN ('chat', 'embedding', 'rerank', 'vision', 'audio', 'image', 'code')),
  context_window INTEGER NOT NULL DEFAULT 8192,
  supports_streaming BOOLEAN NOT NULL DEFAULT true,
  supports_function_calling BOOLEAN NOT NULL DEFAULT false,
  supports_vision BOOLEAN NOT NULL DEFAULT false,
  supports_audio BOOLEAN NOT NULL DEFAULT false,
  supports_embeddings BOOLEAN NOT NULL DEFAULT false,
  requires_gpu BOOLEAN NOT NULL DEFAULT false,
  min_ram_gb NUMERIC(8,2),
  min_vram_gb NUMERIC(8,2),
  internal_cost_per_1k_tokens NUMERIC(12,6) NOT NULL DEFAULT 0,
  sale_price_per_1k_tokens NUMERIC(12,6) NOT NULL DEFAULT 0,
  credit_multiplier NUMERIC(8,3) NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('available', 'installing', 'active', 'inactive', 'offline', 'failed')),
  priority INTEGER NOT NULL DEFAULT 100,
  fallback_model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, engine, model_id, purpose)
);

CREATE INDEX IF NOT EXISTS idx_ai_models_org_status ON ai_models(organization_id, status, purpose, priority);
CREATE INDEX IF NOT EXISTS idx_ai_models_global_status ON ai_models(status, purpose, priority) WHERE organization_id IS NULL;

CREATE TABLE IF NOT EXISTS ai_model_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  route_key TEXT NOT NULL DEFAULT 'default',
  purpose TEXT NOT NULL DEFAULT 'chat',
  primary_model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
  fallback_model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
  max_tokens INTEGER,
  temperature NUMERIC(4,3),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_model_routes_lookup
  ON ai_model_routes(organization_id, agent_id, route_key, purpose, is_active);

CREATE TABLE IF NOT EXISTS ai_client_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  balance NUMERIC(14,3) NOT NULL DEFAULT 0,
  included_monthly_credits NUMERIC(14,3) NOT NULL DEFAULT 0,
  hard_limit NUMERIC(14,3),
  blocked BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);

CREATE TABLE IF NOT EXISTS ai_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  usage_log_id UUID,
  type TEXT NOT NULL CHECK (type IN ('grant', 'debit', 'refund', 'adjustment', 'expiration')),
  amount NUMERIC(14,3) NOT NULL,
  balance_after NUMERIC(14,3),
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_transactions_org_date
  ON ai_credit_transactions(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
  provider TEXT,
  engine TEXT,
  endpoint TEXT,
  model_name TEXT,
  route_key TEXT NOT NULL DEFAULT 'default',
  channel TEXT,
  operation TEXT NOT NULL DEFAULT 'chat',
  input_text TEXT,
  output_text TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  credits_used NUMERIC(12,3) NOT NULL DEFAULT 0,
  internal_cost NUMERIC(12,6) NOT NULL DEFAULT 0,
  sale_value NUMERIC(12,6) NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'blocked', 'fallback')),
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_credit_transactions
  DROP CONSTRAINT IF EXISTS ai_credit_transactions_usage_log_id_fkey;

ALTER TABLE ai_credit_transactions
  ADD CONSTRAINT ai_credit_transactions_usage_log_id_fkey
  FOREIGN KEY (usage_log_id) REFERENCES ai_usage_logs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_org_date ON ai_usage_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_agent_date ON ai_usage_logs(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model_date ON ai_usage_logs(model_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'indexing', 'failed')),
  qdrant_collection TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_bases_org ON ai_knowledge_bases(organization_id, status);

CREATE TABLE IF NOT EXISTS ai_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  knowledge_base_id UUID REFERENCES ai_knowledge_bases(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  storage_url TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  checksum TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'extracting', 'indexing', 'indexed', 'failed', 'deleted')),
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_documents_org_status ON ai_documents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_documents_kb ON ai_documents(knowledge_base_id);

CREATE TABLE IF NOT EXISTS ai_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  knowledge_base_id UUID REFERENCES ai_knowledge_bases(id) ON DELETE CASCADE,
  document_id UUID REFERENCES ai_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  qdrant_point_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_doc ON ai_document_chunks(document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_org ON ai_document_chunks(organization_id, knowledge_base_id);

CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_org_date ON ai_audit_logs(organization_id, created_at DESC);

ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_client_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ai_models" ON ai_models
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on ai_model_routes" ON ai_model_routes
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on ai_client_balances" ON ai_client_balances
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on ai_credit_transactions" ON ai_credit_transactions
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on ai_usage_logs" ON ai_usage_logs
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on ai_knowledge_bases" ON ai_knowledge_bases
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on ai_documents" ON ai_documents
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on ai_document_chunks" ON ai_document_chunks
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on ai_audit_logs" ON ai_audit_logs
  FOR ALL USING (true) WITH CHECK (true);

INSERT INTO ai_models (
  name,
  commercial_name,
  provider,
  engine,
  endpoint,
  model_id,
  purpose,
  context_window,
  supports_streaming,
  supports_embeddings,
  min_ram_gb,
  status,
  priority,
  metadata
)
VALUES
  ('qwen2.5:7b', 'Qwen 2.5 7B Local', 'local', 'ollama', 'http://ollama:11434', 'qwen2.5:7b', 'chat', 32768, true, false, 6, 'active', 10, '{"recommended_for":["whatsapp","crm","general"]}'::jsonb),
  ('llama3.1:8b', 'Llama 3.1 8B Local', 'local', 'ollama', 'http://ollama:11434', 'llama3.1:8b', 'chat', 8192, true, false, 8, 'active', 20, '{"recommended_for":["whatsapp","crm","fallback"]}'::jsonb),
  ('mistral:7b', 'Mistral 7B Local', 'local', 'ollama', 'http://ollama:11434', 'mistral:7b', 'chat', 8192, true, false, 6, 'active', 30, '{"recommended_for":["fast_chat","fallback"]}'::jsonb),
  ('gemma2:9b', 'Gemma 2 9B Local', 'local', 'ollama', 'http://ollama:11434', 'gemma2:9b', 'chat', 8192, true, false, 8, 'available', 40, '{"recommended_for":["general"]}'::jsonb),
  ('phi3:mini', 'Phi 3 Mini Local', 'local', 'ollama', 'http://ollama:11434', 'phi3:mini', 'chat', 4096, true, false, 4, 'available', 50, '{"recommended_for":["lightweight","cpu"]}'::jsonb),
  ('nomic-embed-text', 'Nomic Embed Text Local', 'local', 'ollama', 'http://ollama:11434', 'nomic-embed-text', 'embedding', 8192, false, true, 2, 'active', 10, '{"recommended_for":["rag","embeddings"]}'::jsonb)
ON CONFLICT (organization_id, engine, model_id, purpose) DO NOTHING;
