-- BI Stats RPC
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
        'total_area_ha', COALESCE(SUM((features->>'areaHectares')::numeric), 0),
        'avg_ha_price', CASE 
            WHEN COALESCE(SUM((features->>'areaHectares')::numeric), 0) > 0 
            THEN COALESCE(SUM(price), 0) / SUM((features->>'areaHectares')::numeric) 
            ELSE 0 
        END
    ) INTO result
    FROM properties
    WHERE organization_id = org_id;
    
    RETURN result;
END;
$$;

-- BI Lead Sources RPC
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
