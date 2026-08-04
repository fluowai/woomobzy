-- Agent Guardrails Configuration
-- Permite configurar regras de seguranca e limites por agente IA
CREATE TABLE IF NOT EXISTS agent_guardrails_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
  strict_context_mode BOOLEAN DEFAULT true,
  allowed_topics JSONB DEFAULT '["imovel","casa","apartamento","terreno","fazenda","sitio","chacara","area","hectare","alqueire","comprar","vender","alugar","locacao","arrendar","visita","proposta","financiamento","entrada","parcela","car","matricula","ccir","incra","contrato","locar","imobiliaria","corretor"]'::jsonb,
  blocked_topics JSONB DEFAULT '["politica","eleicao","partido","religiao","deus","igreja","futebol","esporte","saude","doenca","medicamento","advogado","processo","judicial","investimento","bitcoin","cripto","drogas","arma","assalto","hack"]'::jsonb,
  max_conversation_turns INTEGER DEFAULT 50,
  off_topic_redirect_message TEXT DEFAULT 'No momento eu ajudo apenas com imoveis. Posso te ajudar a encontrar o imovel ideal?',
  max_off_topic_attempts INTEGER DEFAULT 2,
  rate_limit_per_minute INTEGER DEFAULT 10,
  off_hours_auto_reply BOOLEAN DEFAULT true,
  off_hours_message TEXT DEFAULT 'Estamos em horario de atendimento. Deixe sua mensagem que retornamos em breve.',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(organization_id, agent_id)
);

ALTER TABLE agent_guardrails_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org guardrails config"
  ON agent_guardrails_config FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert guardrails config for their org"
  ON agent_guardrails_config FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org guardrails config"
  ON agent_guardrails_config FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org guardrails config"
  ON agent_guardrails_config FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_agent_guardrails_config_org_agent
  ON agent_guardrails_config(organization_id, agent_id);