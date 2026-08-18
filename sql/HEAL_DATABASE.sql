-- ============================================================
-- IMOBZY DATABASE HEALING SCRIPT
-- Execute este script no SQL Editor do Supabase para corrigir 
-- erros de Schema Cache (PGRST204) e RPCs ausentes.
-- ============================================================

-- 1. Garantir que a tabela site_settings existe com as colunas corretas
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  agency_name TEXT,
  primary_color TEXT DEFAULT '#064e3b',
  secondary_color TEXT DEFAULT '#d4af37',
  logo_url TEXT,
  header_color TEXT,
  footer_text TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  layout_config JSONB DEFAULT '{}'::jsonb,
  integrations JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Corrigir nomes de colunas caso existam versões antigas
DO $$ 
BEGIN
  -- Se existir uma coluna 'logo' antiga, migrar para 'logo_url' e remover
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'logo') THEN
    UPDATE site_settings SET logo_url = logo WHERE logo_url IS NULL;
    ALTER TABLE site_settings DROP COLUMN logo;
  END IF;
END $$;

-- 3. Criar RPC get_bi_stats
CREATE OR REPLACE FUNCTION get_bi_stats(org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_value', COALESCE(SUM(price), 0),
        'property_count', COUNT(*),
        'total_area_ha', COALESCE(SUM(total_area_ha), 0),
        'avg_ha_price', CASE 
            WHEN COALESCE(SUM(total_area_ha), 0) > 0 
            THEN COALESCE(SUM(price), 0) / SUM(total_area_ha) 
            ELSE 0 
        END
    ) INTO result
    FROM properties
    WHERE organization_id = org_id;
    
    RETURN result;
END;
$$;

-- 4. Criar RPC get_bi_lead_sources
CREATE OR REPLACE FUNCTION get_bi_lead_sources(org_id UUID)
RETURNS TABLE (name TEXT, value BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(source, 'Outros') as name,
        COUNT(*) as value
    FROM leads
    WHERE organization_id = org_id
    GROUP BY source
    ORDER BY value DESC;
END;
$$;

-- 5. FORÇAR RELOAD DO SCHEMA CACHE (Resolve PGRST204 / PGRST205)
-- Este comando avisa ao PostgREST que o banco mudou e ele deve atualizar os metadados.
NOTIFY pgrst, 'reload schema';

SELECT '✅ Banco de dados sincronizado com sucesso!' as status;
