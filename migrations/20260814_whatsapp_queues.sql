CREATE TABLE IF NOT EXISTS whatsapp_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_queues_org ON whatsapp_queues(organization_id);

ALTER TABLE whatsapp_queues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view queues of their organization" ON whatsapp_queues
  FOR SELECT USING (organization_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can modify queues of their organization" ON whatsapp_queues
  FOR ALL USING (organization_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Linking users (corretores) to queues
CREATE TABLE IF NOT EXISTS whatsapp_queue_users (
  queue_id UUID NOT NULL REFERENCES whatsapp_queues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (queue_id, user_id)
);

ALTER TABLE whatsapp_queue_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view queue_users of their organization" ON whatsapp_queue_users
  FOR SELECT USING (queue_id IN (SELECT id FROM whatsapp_queues WHERE organization_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can modify queue_users of their organization" ON whatsapp_queue_users
  FOR ALL USING (queue_id IN (SELECT id FROM whatsapp_queues WHERE organization_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())));
