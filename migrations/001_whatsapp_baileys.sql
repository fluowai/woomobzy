-- ============================================
-- WhatsApp Baileys Tables
-- ============================================

-- Instâncias WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connecting', 'connected', 'disconnected', 'reconnecting')),
  qr_code TEXT,
  session_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Conversas
CREATE TABLE IF NOT EXISTS whatsapp_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  jid TEXT NOT NULL,
  name TEXT,
  profile_photo_url TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instance_id, jid)
);

-- Mensagens
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES whatsapp_chats(id) ON DELETE CASCADE,
  key_id TEXT,
  message_type TEXT,
  content TEXT,
  media_url TEXT,
  from_me BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'received', 'failed')),
  timestamp TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_org ON whatsapp_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_instance ON whatsapp_chats(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_last_message ON whatsapp_chats(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat ON whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp DESC);

-- RLS Policies
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários veem apenas instâncias da sua organização
CREATE POLICY "Users can view own organization instances"
  ON whatsapp_instances FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage instances"
  ON whatsapp_instances FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Policy: Chats seguindo instance
CREATE POLICY "Users can view own instance chats"
  ON whatsapp_chats FOR SELECT
  USING (
    instance_id IN (
      SELECT id FROM whatsapp_instances WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage chats"
  ON whatsapp_chats FOR ALL
  USING (
    instance_id IN (
      SELECT id FROM whatsapp_instances WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Policy: Messages seguindo chat -> instance -> org
CREATE POLICY "Users can view own instance messages"
  ON whatsapp_messages FOR SELECT
  USING (
    chat_id IN (
      SELECT wc.id FROM whatsapp_chats wc
      JOIN whatsapp_instances wi ON wc.instance_id = wi.id
      WHERE wi.organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage messages"
  ON whatsapp_messages FOR ALL
  USING (
    chat_id IN (
      SELECT wc.id FROM whatsapp_chats wc
      JOIN whatsapp_instances wi ON wc.instance_id = wi.id
      WHERE wi.organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
