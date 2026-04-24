-- ============================================================
-- IMOBZY v6 — Contact Store & Mention Resolution
-- Resolve: pushName, menções (@), identidade de participantes
-- ============================================================

-- 1. Tabela de Contatos (Contact Store Persistente)
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  jid TEXT NOT NULL,
  push_name TEXT,
  verified_name TEXT,
  notify TEXT,
  short_name TEXT,
  profile_photo_url TEXT,
  is_business BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instance_id, jid)
);

-- 2. Colunas faltantes em whatsapp_messages
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS sender_jid TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS mentioned_jids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- 3. Coluna faltante em whatsapp_chats
ALTER TABLE whatsapp_chats ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_instance ON whatsapp_contacts(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_jid ON whatsapp_contacts(jid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_lookup ON whatsapp_contacts(instance_id, jid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sender_jid ON whatsapp_messages(sender_jid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_key_id ON whatsapp_messages(key_id);

-- 5. RLS para whatsapp_contacts
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own instance contacts"
  ON whatsapp_contacts FOR SELECT
  USING (
    instance_id IN (
      SELECT id FROM whatsapp_instances WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage contacts"
  ON whatsapp_contacts FOR ALL
  USING (
    instance_id IN (
      SELECT id FROM whatsapp_instances WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

SELECT 'Migration v6: Contact Store & Mentions — SUCCESS' AS result;
