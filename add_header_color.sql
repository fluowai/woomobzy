-- Adiciona coluna de cor do cabeçalho
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS header_color TEXT;
