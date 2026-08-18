-- FIX RLS AND RPC FUNCTIONS FOR IMOBZY
-- Execute no SQL Editor do Supabase

-- 1. Função robusta para obter Organization ID
CREATE OR REPLACE FUNCTION get_my_org_id() 
RETURNS uuid AS $$
BEGIN
  -- Tenta primeiro pelo JWT (mais rápido)
  IF (auth.jwt() -> 'app_metadata' ->> 'organization_id') IS NOT NULL THEN
    RETURN (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid;
  END IF;

  -- Fallback para consulta direta no profile (mais seguro)
  RETURN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Corrigir Landing Pages RLS
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation landing_pages" ON landing_pages;
CREATE POLICY "Tenant isolation landing_pages" ON landing_pages 
  FOR ALL TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Public read landing_pages" ON landing_pages;
CREATE POLICY "Public read landing_pages" ON landing_pages 
  FOR SELECT TO anon 
  USING (is_active = true);

-- 3. Corrigir Billing (Financeiro)
CREATE TABLE IF NOT EXISTS billing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    contract_id UUID,
    amount NUMERIC(20,2),
    due_date DATE,
    payment_date DATE,
    status TEXT DEFAULT 'aberto',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation billing" ON billing;
CREATE POLICY "Tenant isolation billing" ON billing 
  FOR ALL TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- 4. Criar Funções de RPC para o Relatório (BI) Rural
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
        'total_area_ha', COALESCE(SUM(total_area_ha), SUM((features->>'areaHectares')::numeric), 0),
        'avg_ha_price', CASE 
            WHEN (COALESCE(SUM(total_area_ha), SUM((features->>'areaHectares')::numeric), 0)) > 0 
            THEN COALESCE(SUM(price), 0) / (COALESCE(SUM(total_area_ha), SUM((features->>'areaHectares')::numeric), 0))
            ELSE 0 
        END
    ) INTO result
    FROM properties
    WHERE organization_id = org_id;
    
    RETURN result;
END;
$$;

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

-- 5. Sincronizar metadados para garantir que get_my_org_id() funcione via JWT no futuro
UPDATE auth.users u
SET raw_app_meta_data = raw_app_meta_data || 
    jsonb_build_object('organization_id', p.organization_id)
FROM profiles p
WHERE u.id = p.id AND p.organization_id IS NOT NULL;
