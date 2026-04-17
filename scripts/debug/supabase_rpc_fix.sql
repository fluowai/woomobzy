-- RPC to get public tenant info for domain routing
CREATE OR REPLACE FUNCTION public.get_tenant_public(slug_input text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org record;
  v_settings record;
BEGIN
  -- 1. Find organization by slug
  SELECT id, name, slug, subdomain, logo_url, primary_color, secondary_color, plan
  INTO v_org
  FROM public.organizations
  WHERE slug = slug_input OR subdomain = slug_input
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 2. Get site settings for organization
  SELECT *
  INTO v_settings
  FROM public.site_settings
  WHERE organization_id = v_org.id
  LIMIT 1;

  -- 3. Return combined JSON
  RETURN json_build_object(
    'organization', row_to_json(v_org),
    'settings', row_to_json(v_settings)
  );
END;
$$;

-- Grant execution to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_tenant_public TO anon, authenticated;
