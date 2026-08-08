-- ============================================================
-- Migration: Signature Provider Config per Tenant
-- Cada organização/usuário pode cadastrar suas próprias
-- API keys de provedores externos (ClickSign, ZapSign, DocuSign).
-- WooSign (Documenso self-hosted) continua global via .env.
-- ============================================================

CREATE TABLE IF NOT EXISTS signature_provider_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('clicksign','zapsign','docusign','woosign')),
  api_key TEXT,
  webhook_secret TEXT,
  api_url TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_signature_provider_configs_org
  ON signature_provider_configs(organization_id);
