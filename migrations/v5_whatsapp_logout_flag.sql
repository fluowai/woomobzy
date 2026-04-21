-- Migration: Add logout_requested flag to whatsapp_instances
-- Purpose: Differentiate user logout from technical disconnection

ALTER TABLE whatsapp_instances ADD COLUMN IF NOT EXISTS logout_requested BOOLEAN DEFAULT false;

COMMENT ON COLUMN whatsapp_instances.logout_requested IS 'Flag para indicando logout voluntário (não reconectar automaticamente)';

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_logout ON whatsapp_instances(logout_requested) WHERE logout_requested = true;

SELECT 'Migration: logout_requested column added successfully' AS result;