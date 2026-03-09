
-- Adiciona a coluna 'integrations' do tipo JSONB na tabela site_settings
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS integrations JSONB DEFAULT '{}'::jsonb;
