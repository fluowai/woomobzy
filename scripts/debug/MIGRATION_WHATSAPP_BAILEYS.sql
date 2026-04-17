-- ============================================
-- IMOBZY - WhatsApp Baileys Migration
-- Execute este arquivo no Supabase SQL Editor
-- https://supabase.com/dashboard/project/lkzcsaydpcnypdevoikr
-- ============================================

-- Passo 1: Criar tabela de instâncias WhatsApp
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

-- Passo 2: Criar tabela de conversas
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

-- Passo 3: Criar tabela de mensagens
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

-- Passo 4: Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_org ON whatsapp_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_instance ON whatsapp_chats(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_last_message ON whatsapp_chats(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat ON whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp DESC);

-- Passo 5: Habilitar RLS
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Passo 6: Criar políticas RLS
-- Policy: Usuários veem apenas instâncias da sua organização
DROP POLICY IF EXISTS "Users can view own organization instances" ON whatsapp_instances;
CREATE POLICY "Users can view own organization instances"
  ON whatsapp_instances FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage instances" ON whatsapp_instances;
CREATE POLICY "Admins can manage instances"
  ON whatsapp_instances FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Users can view own instance chats" ON whatsapp_chats;
CREATE POLICY "Users can view own instance chats"
  ON whatsapp_chats FOR SELECT
  USING (
    instance_id IN (
      SELECT id FROM whatsapp_instances WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "System can manage chats" ON whatsapp_chats;
CREATE POLICY "System can manage chats"
  ON whatsapp_chats FOR ALL
  USING (
    instance_id IN (
      SELECT id FROM whatsapp_instances WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can view own instance messages" ON whatsapp_messages;
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

DROP POLICY IF EXISTS "System can manage messages" ON whatsapp_messages;
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

-- Verificar se as tabelas foram criadas
SELECT 'whatsapp_instances' as table_name, COUNT(*) as count FROM whatsapp_instances
UNION ALL
SELECT 'whatsapp_chats', COUNT(*) FROM whatsapp_chats
UNION ALL
SELECT 'whatsapp_messages', COUNT(*) FROM whatsapp_messages;

-- ============================================
-- Migração concluída com sucesso!
-- ============================================
