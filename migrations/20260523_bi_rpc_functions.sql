-- BI Rural RPCs used by views/BIRural.tsx.
-- Fixes Supabase REST 404 on /rest/v1/rpc/get_bi_stats and /rest/v1/rpc/get_bi_lead_sources.

CREATE OR REPLACE FUNCTION public.get_bi_stats(org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_value', COALESCE(SUM(COALESCE(price, 0)), 0),
    'property_count', COUNT(*),
    'total_area_ha', COALESCE(SUM(COALESCE(total_area_ha, 0)), 0),
    'avg_ha_price',
      CASE
        WHEN COALESCE(SUM(COALESCE(total_area_ha, 0)), 0) > 0
          THEN COALESCE(SUM(COALESCE(price, 0)), 0) / SUM(COALESCE(total_area_ha, 0))
        ELSE 0
      END
  )
  INTO result
  FROM public.properties
  WHERE organization_id = org_id
    AND COALESCE(status, '') <> 'Pendente'
    AND (
      property_type IN (
        'Fazenda',
        'Sítio',
        'Chácara',
        'Área Produtiva',
        'Gleba',
        'Rural',
        'Estância',
        'Haras',
        'Granja',
        'Agropecuária',
        'Terreno Rural',
        'Lote Rural'
      )
      OR niche = 'rural'
    );

  RETURN COALESCE(
    result,
    jsonb_build_object(
      'total_value', 0,
      'property_count', 0,
      'total_area_ha', 0,
      'avg_ha_price', 0
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_bi_lead_sources(org_id UUID)
RETURNS TABLE (name TEXT, value BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(NULLIF(TRIM(source), ''), 'Outros') AS name,
    COUNT(*)::BIGINT AS value
  FROM public.leads
  WHERE organization_id = org_id
  GROUP BY COALESCE(NULLIF(TRIM(source), ''), 'Outros')
  ORDER BY value DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_bi_stats(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_bi_lead_sources(UUID) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
