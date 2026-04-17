
-- Adiciona colunas de personalização de fontes e tamanhos
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Inter, sans-serif',
ADD COLUMN IF NOT EXISTS base_font_size INTEGER DEFAULT 16,
ADD COLUMN IF NOT EXISTS heading_font_size INTEGER DEFAULT 48;
