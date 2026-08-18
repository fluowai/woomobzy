-- ============================================
-- IMOBZY RURAL PLATFORM - EMAIL MODULE SCHEMA
-- ============================================

-- 1. EXTENSÕES (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE CONTAS DE EMAIL
CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  imap_host TEXT,
  imap_port INTEGER DEFAULT 993,
  imap_secure BOOLEAN DEFAULT true,
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 465,
  smtp_secure BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sync_status TEXT DEFAULT 'idle',
  sync_error TEXT,
  last_synced_at TIMESTAMPTZ,
  last_inbox_uid BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE EMAILS (SINCRONIZADOS/ENVIADOS)
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  folder TEXT DEFAULT 'inbox', -- inbox, sent, archive, trash
  direction TEXT DEFAULT 'incoming', -- incoming, outgoing
  subject TEXT,
  from_name TEXT,
  from_email TEXT NOT NULL,
  to_email TEXT[] DEFAULT '{}',
  cc_email TEXT[] DEFAULT '{}',
  body_html TEXT,
  body_text TEXT,
  preview TEXT,
  date TIMESTAMPTZ NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  message_id TEXT,
  in_reply_to TEXT,
  references_ids TEXT[] DEFAULT '{}',
  thread_id TEXT,
  imap_uid BIGINT,
  raw_headers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, folder, imap_uid)
);

-- 4. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_emails_account_id ON emails(account_id);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_lead_id ON emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);

-- 5. RLS (Row Level Security) - Basic Setup (Customize as needed)
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's email accounts"
  ON email_accounts FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage their organization's email accounts"
  ON email_accounts FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view their organization's emails"
  ON emails FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage their organization's emails"
  ON emails FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));
