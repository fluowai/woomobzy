-- Adiciona a coluna home_content para armazenar textos dinâmicos da home
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS home_content JSONB DEFAULT '{}'::jsonb;
