
-- Function to get Evolution API Config with Fallback securely
CREATE OR REPLACE FUNCTION get_evolution_config(request_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS by running as owner
SET search_path = public -- Secure search path
AS $$
DECLARE
    tenant_config JSONB;
    global_config RECORD;
BEGIN
    -- 1. Try to find Tenant Config
    -- Check if organization_id matches (or if it's null/global context check)
    IF request_org_id IS NOT NULL THEN
        SELECT integrations->'evolutionApi' INTO tenant_config
        FROM site_settings
        WHERE organization_id = request_org_id
        LIMIT 1;
    END IF;

    -- If Tenant config has a baseUrl, return it
    IF tenant_config IS NOT NULL AND (tenant_config->>'baseUrl') IS NOT NULL AND (tenant_config->>'baseUrl') <> '' THEN
        RETURN tenant_config;
    END IF;

    -- 2. Fallback to Global Settings (Super Admin)
    SELECT global_evolution_url, global_evolution_api_key INTO global_config
    FROM saas_settings
    WHERE id = 1;

    IF global_config.global_evolution_url IS NOT NULL AND global_config.global_evolution_url <> '' THEN
        RETURN jsonb_build_object(
            'baseUrl', global_config.global_evolution_url,
            'token', global_config.global_evolution_api_key,
            'enabled', true
        );
    END IF;

    -- 3. Return null if nothing found
    RETURN NULL;
END;
$$;

-- Grant execution to anon and authenticated (since Backend might use anon)
GRANT EXECUTE ON FUNCTION get_evolution_config(UUID) TO anon, authenticated, service_role;
