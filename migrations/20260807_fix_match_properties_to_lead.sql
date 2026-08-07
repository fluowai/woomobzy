-- ============================================================================
-- Migration: Fix match_properties_to_lead RPC (400 error on LeadDetailsModal)
-- Date: 2026-08-07
--
-- Problem:
--   1. The RPC body referenced columns that do not exist in `properties`
--      (`p.bedrooms`, `p.area`). The live `properties` table is rural land and
--      only has `total_area_ha`, `area_total_ha`, `area_util_ha` and
--      `features->>'areaHectares'`. This raised a runtime error on every call
--      (surfaced as 400 from PostgREST).
--   2. The RPC returned `id`/`match_score`, but LeadDetailsModal consumes
--      `property_id`, `score` and `reasons`.
--
-- Fix:
--   - Score by property_type, price (budget/budget_min/budget_max),
--     area (preferences minArea/maxArea vs hectares) and preferred states.
--   - Return the columns expected by the frontend: property_id, title,
--     property_type, price, area, address, neighborhood, city, state, status,
--     score, reasons.
-- ============================================================================

-- Drop old signature (return type changed, CREATE OR REPLACE cannot alter it)
DROP FUNCTION IF EXISTS public.match_properties_to_lead;

CREATE OR REPLACE FUNCTION public.match_properties_to_lead(
  lead_id uuid,
  max_results int DEFAULT 5
)
RETURNS TABLE (
  property_id uuid,
  title text,
  property_type text,
  price numeric,
  area numeric,
  address text,
  neighborhood text,
  city text,
  state text,
  status text,
  score numeric,
  reasons text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_org_id uuid;
  v_budget_min numeric;
  v_budget_max numeric;
  v_area_min numeric;
  v_area_max numeric;
BEGIN
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = lead_id;

  IF v_lead IS NULL THEN
    RETURN;
  END IF;

  v_org_id := v_lead.organization_id;

  -- Price range: budget_min..budget_max, falling back to budget
  v_budget_min := COALESCE(v_lead.budget_min, v_lead.budget, 0);
  v_budget_max := COALESCE(v_lead.budget_max, v_lead.budget, 999999999);

  -- Area range (hectares): preferences.minArea/maxArea, falling back to area_min/area_max
  v_area_min := COALESCE((v_lead.preferences->>'minArea')::numeric, v_lead.area_min, 0);
  v_area_max := COALESCE((v_lead.preferences->>'maxArea')::numeric, v_lead.area_max, 999999);

  RETURN QUERY
  SELECT
    p.id AS property_id,
    p.title,
    p.property_type,
    p.price,
    COALESCE(
      p.total_area_ha,
      p.area_total_ha,
      (p.features->>'areaHectares')::numeric,
      0
    )::numeric AS area,
    p.address,
    p.neighborhood,
    p.city,
    p.state,
    p.status,
    (
      CASE
        WHEN v_lead.property_type IS NOT NULL
         AND p.property_type = v_lead.property_type THEN 25
        ELSE 0
      END
      + CASE
        WHEN p.price IS NOT NULL
         AND p.price BETWEEN v_budget_min AND v_budget_max THEN 30
        ELSE 0
      END
      + CASE
        WHEN COALESCE(p.total_area_ha, p.area_total_ha, (p.features->>'areaHectares')::numeric)
          BETWEEN v_area_min AND v_area_max THEN 20
        ELSE 0
      END
      + CASE
        WHEN EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(v_lead.preferences->'states', '[]'::jsonb)) s
          WHERE s = p.state
        ) THEN 10
        ELSE 0
      END
    )::numeric AS score,
    array_remove(
      ARRAY[
        CASE
          WHEN v_lead.property_type IS NOT NULL
           AND p.property_type = v_lead.property_type THEN 'Mesmo tipo de imóvel'
          ELSE NULL
        END,
        CASE
          WHEN p.price IS NOT NULL
           AND p.price BETWEEN v_budget_min AND v_budget_max THEN 'Dentro do orçamento'
          ELSE NULL
        END,
        CASE
          WHEN COALESCE(p.total_area_ha, p.area_total_ha, (p.features->>'areaHectares')::numeric)
            BETWEEN v_area_min AND v_area_max THEN 'Área compatível'
          ELSE NULL
        END
      ]::text[],
      NULL
    ) AS reasons
  FROM public.properties p
  WHERE p.organization_id = v_org_id
    AND p.status IN ('Disponível', 'available', 'disponivel', 'Ativo')
  ORDER BY score DESC, p.price ASC
  LIMIT max_results;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_properties_to_lead TO authenticated;

-- Reload PostgREST schema cache so the new signature is picked up immediately
NOTIFY pgrst, 'reload schema';
