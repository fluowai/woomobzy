-- ============================================
-- RPC: get_reseller_branding
-- Resolve o branding (logo + cores + nome) da
-- REVENDA (org parent) de um tenant público.
-- Usada pela página "Em breve" (ComingSoon) para
-- personalizar a página com a marca da revenda
-- quando o cliente (slug/subdomain/custom_domain)
-- foi criado sob uma revenda (parent_id).
-- ============================================

CREATE OR REPLACE FUNCTION public.get_reseller_branding(slug_input TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH tenant AS (
    SELECT o.*
    FROM public.organizations o
    WHERE o.slug = slug_input
       OR o.subdomain = slug_input
       OR o.custom_domain = slug_input
    LIMIT 1
  )
  SELECT
    p.id,
    p.name,
    p.slug,
    p.logo_url,
    p.primary_color,
    p.secondary_color
  FROM public.organizations p
  JOIN tenant t ON p.id = t.parent_id
  WHERE p.is_reseller = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_reseller_branding(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reseller_branding(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_reseller_branding(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
