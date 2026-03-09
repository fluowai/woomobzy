
-- SCRIPT DE REPARO: Adiciona todas as colunas necessárias para personalização
-- Execute este script no SQL Editor do Supabase

DO $$ 
BEGIN 
    -- 1. Coluna de Altura da Logo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='logo_height') THEN
        ALTER TABLE site_settings ADD COLUMN logo_height INTEGER DEFAULT 80;
    END IF;

    -- 2. Coluna de Cor do Cabeçalho
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='header_color') THEN
        ALTER TABLE site_settings ADD COLUMN header_color TEXT;
    END IF;

    -- 3. Colunas de Tipografia
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='font_family') THEN
        ALTER TABLE site_settings ADD COLUMN font_family TEXT DEFAULT 'Inter, sans-serif';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='base_font_size') THEN
        ALTER TABLE site_settings ADD COLUMN base_font_size INTEGER DEFAULT 16;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='heading_font_size') THEN
        ALTER TABLE site_settings ADD COLUMN heading_font_size INTEGER DEFAULT 48;
    END IF;

    -- 4. Coluna de Integrações (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_settings' AND column_name='integrations') THEN
        ALTER TABLE site_settings ADD COLUMN integrations JSONB DEFAULT '{}'::jsonb;
    END IF;

END $$;
