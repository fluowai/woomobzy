-- Fix WhatsApp Instances status constraint to allow 'qr_pending'
ALTER TABLE whatsapp_instances 
DROP CONSTRAINT IF EXISTS whatsapp_instances_status_check;

ALTER TABLE whatsapp_instances 
ADD CONSTRAINT whatsapp_instances_status_check 
CHECK (status IN ('pending', 'connecting', 'qr_pending', 'connected', 'disconnected', 'reconnecting'));
