-- ============================================================
-- Migration v8: Fix RPCs de BI + Views de compatibilidade
-- Corrige: get_bi_stats, get_bi_lead_sources (404)
--           billing -> billings (alias), contracts -> view
-- ============================================================

-- 1. RPC get_bi_stats (retorna estatísticas gerais do portfólio)
CREATE OR REPLACE FUNCTION get_bi_stats(org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_value',     COALESCE(SUM(price), 0),
        'property_count',  COUNT(*),
        'total_area_ha',   COALESCE(SUM((features->>'areaHectares')::numeric), 0),
        'avg_ha_price', CASE
            WHEN COALESCE(SUM((features->>'areaHectares')::numeric), 0) > 0
            THEN COALESCE(SUM(price), 0) / SUM((features->>'areaHectares')::numeric)
            ELSE 0
        END
    ) INTO result
    FROM properties
    WHERE organization_id = org_id;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 2. RPC get_bi_lead_sources (retorna contagem de leads por canal)
CREATE OR REPLACE FUNCTION get_bi_lead_sources(org_id UUID)
RETURNS TABLE (name TEXT, value BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(source, 'Outros') AS name,
        COUNT(*)::BIGINT           AS value
    FROM leads
    WHERE organization_id = org_id
    GROUP BY source
    ORDER BY value DESC;
END;
$$;

-- 3. View "billings" como alias de "billing" (evita 400 Bad Request)
--    O frontend chama /rest/v1/billings mas a tabela real é "billing"
CREATE OR REPLACE VIEW billings AS
    SELECT
        b.*,
        rc.tenant_name,
        rc.property_id
    FROM billing b
    LEFT JOIN rental_contracts rc ON rc.id = b.contract_id;

-- 4. View "contracts" como alias de "rental_contracts" com campos esperados
--    O frontend chama /rest/v1/contracts?status=eq.Active
CREATE OR REPLACE VIEW contracts AS
    SELECT
        id,
        organization_id,
        tenant_name,
        property_id,
        monthly_rent  AS value,
        status,
        start_date,
        end_date,
        created_at
    FROM rental_contracts;

-- 5. Garantir permissões nas views
GRANT SELECT ON billings TO authenticated;
GRANT SELECT ON contracts TO authenticated;

SELECT 'Migration v8 (Fix BI RPCs + Views billings/contracts) completed!' AS result;
