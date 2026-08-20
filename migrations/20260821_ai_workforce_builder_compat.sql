-- Corrective migration: add AI Workforce Builder columns to legacy ai_agents table
-- Keeps WhatsApp automation columns (personality, response_style, handoff_rules, etc.)
-- while adding the new multi-agent operation schema columns.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agents' AND column_name = 'type') THEN
    ALTER TABLE ai_agents ADD COLUMN type public.ai_agent_type NOT NULL DEFAULT 'SPECIALIST';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agents' AND column_name = 'operation_id') THEN
    ALTER TABLE ai_agents ADD COLUMN operation_id UUID REFERENCES ai_operations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agents' AND column_name = 'description') THEN
    ALTER TABLE ai_agents ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agents' AND column_name = 'status') THEN
    ALTER TABLE ai_agents ADD COLUMN status public.ai_agent_status NOT NULL DEFAULT 'DRAFT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agents' AND column_name = 'active_version_id') THEN
    ALTER TABLE ai_agents ADD COLUMN active_version_id UUID REFERENCES ai_agent_versions(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agents' AND column_name = 'channel_config') THEN
    ALTER TABLE ai_agents ADD COLUMN channel_config JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agents' AND column_name = 'health_status') THEN
    ALTER TABLE ai_agents ADD COLUMN health_status public.ai_health_status DEFAULT 'UNKNOWN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agents' AND column_name = 'metrics') THEN
    ALTER TABLE ai_agents ADD COLUMN metrics JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agents' AND column_name = 'ai_status') THEN
    ALTER TABLE ai_agents ADD COLUMN ai_status TEXT NOT NULL DEFAULT 'ACTIVE';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_agents_operation ON ai_agents(operation_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active_version ON ai_agents(active_version_id);