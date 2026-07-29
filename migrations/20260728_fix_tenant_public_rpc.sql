-- Keep public tenant discovery compatible with organizations schemas where
-- optional branding columns have not been added yet.
CREATE OR REPLACE FUNCTION public.get_tenant_public(slug_input TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  custom_domain TEXT,
  subdomain TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  niche TEXT,
  logo_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH organizations_json AS (
    SELECT to_jsonb(organization_row) AS data
    FROM public.organizations AS organization_row
  )
  SELECT
    (data ->> 'id')::UUID,
    data ->> 'name',
    data ->> 'slug',
    data ->> 'custom_domain',
    data ->> 'subdomain',
    data ->> 'primary_color',
    data ->> 'secondary_color',
    data ->> 'niche',
    data ->> 'logo_url'
  FROM organizations_json
  WHERE data ->> 'slug' = slug_input
     OR data ->> 'subdomain' = slug_input
     OR data ->> 'custom_domain' = slug_input
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_public(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_public(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_public(TEXT) TO authenticated;
