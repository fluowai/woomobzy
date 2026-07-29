-- ============================================================================
-- Migration: Create match_properties_to_lead RPC with correct param names
-- Date: 2026-07-29
-- Fixes: 404 error when LeadDetailsModal calls supabase.rpc('match_properties_to_lead')
-- The frontend calls: supabase.rpc('match_properties_to_lead', { lead_id, max_results })
-- ============================================================================

-- Drop the function if it exists with old signature
DROP FUNCTION IF EXISTS public.match_properties_to_lead;

-- Create helper if not exists
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'organization_id', '')::uuid,
    (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1)
  );
$$;

-- Create the function with the signature expected by the frontend
CREATE OR REPLACE FUNCTION public.match_properties_to_lead(
  lead_id uuid,
  max_results int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  property_type text,
  price numeric,
  bedrooms integer,
  area numeric,
  address text,
  neighborhood text,
  city text,
  state text,
  status text,
  match_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_lead record;
BEGIN
  -- Get the lead's org and data
  SELECT l.* INTO v_lead
  FROM leads l
  WHERE l.id = lead_id;

  IF v_lead IS NULL THEN
    RETURN;
  END IF;

  v_org_id := v_lead.organization_id;

  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.property_type,
    p.price,
    p.bedrooms,
    p.area,
    p.address,
    p.neighborhood,
    p.city,
    p.state,
    p.status,
    (
      CASE WHEN p.property_type IS NOT NULL
        AND p.property_type = COALESCE(v_lead.property_type, p.property_type)
        THEN 25 ELSE 0 END
      + CASE WHEN p.price BETWEEN COALESCE(v_lead.budget, 0) AND COALESCE(v_lead.budget, 999999999)
        THEN 30 ELSE 0 END
      + CASE WHEN p.bedrooms IS NOT NULL
        AND p.bedrooms = COALESCE(v_lead.bedrooms, p.bedrooms)
        THEN 25 ELSE 0 END
      + CASE WHEN p.area BETWEEN COALESCE((v_lead.preferences->>'minArea')::numeric, 0)
        AND COALESCE((v_lead.preferences->>'maxArea')::numeric, 999999)
        THEN 20 ELSE 0 END
    )::numeric AS match_score
  FROM properties p
  WHERE p.organization_id = v_org_id
    AND p.status IN ('available', 'disponivel', 'Ativo')
  ORDER BY match_score DESC
  LIMIT max_results;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.match_properties_to_lead TO authenticated;
