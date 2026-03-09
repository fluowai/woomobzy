
-- Adiciona a coluna 'logo_height' do tipo integer na tabela site_settings
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS logo_height INTEGER DEFAULT 80;
