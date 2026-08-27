ALTER TABLE signatures ADD COLUMN IF NOT EXISTS selfie_url text;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS document_url text;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS geolocation_lat numeric;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS geolocation_lng numeric;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS whatsapp_validation_code text;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS is_whatsapp_validated boolean DEFAULT false;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS token_hash text;
