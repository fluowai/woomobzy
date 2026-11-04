-- ============================================================================
-- Migration: Fix backend errors (match_properties_to_lead, clients table, etc.)
-- Date: 2026-07-28
-- ============================================================================

-- 0. Ensure helper functions exist (idempotent)
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'organization_id', '')::uuid,
    (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'superadmin'
  );
$$;

-- 1. Create the match_properties_to_lead RPC function
-- Called from LeadDetailsModal.tsx and NewLeadModal.tsx via supabase.rpc()
-- Matches properties to a lead based on type, price range, bedrooms, and area
CREATE OR REPLACE FUNCTION public.match_properties_to_lead(
  p_lead_id uuid,
  p_property_type text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_bedrooms integer DEFAULT NULL,
  p_min_area numeric DEFAULT NULL,
  p_max_area numeric DEFAULT NULL
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
  WHERE l.id = p_lead_id;

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
      -- Score: +30 price match, +25 type match, +25 bedrooms match, +20 area match
      CASE WHEN p.property_type IS NOT NULL AND p.property_type = COALESCE(p_property_type, v_lead.property_type, p.property_type) THEN 25 ELSE 0 END
      + CASE WHEN p.price BETWEEN COALESCE(p_min_price, v_lead.budget_min, 0) AND COALESCE(p_max_price, v_lead.budget_max, 999999999) THEN 30 ELSE 0 END
      + CASE WHEN p.bedrooms IS NOT NULL AND p.bedrooms = COALESCE(p_bedrooms, v_lead.bedrooms, p.bedrooms) THEN 25 ELSE 0 END
      + CASE WHEN p.area BETWEEN COALESCE(p_min_area, v_lead.area_min, 0) AND COALESCE(p_max_area, v_lead.area_max, 999999) THEN 20 ELSE 0 END
    )::numeric AS match_score
  FROM properties p
  WHERE p.organization_id = v_org_id
    AND p.status IN ('available', 'disponivel', 'Ativo')
    AND (p_property_type IS NULL OR p.property_type = p_property_type OR v_lead.property_type IS NULL OR p.property_type = v_lead.property_type)
    AND (p.bedrooms IS NULL OR p_bedrooms IS NULL OR v_lead.bedrooms IS NULL OR p.bedrooms = COALESCE(p_bedrooms, v_lead.bedrooms))
  ORDER BY match_score DESC
  LIMIT 10;
END;
$$;

-- Ensure the function is callable by authenticated users
GRANT EXECUTE ON FUNCTION public.match_properties_to_lead TO authenticated;

-- 2. Ensure clients table exists (for CRM clients POST route)
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  whatsapp text,
  cpf_cnpj text,
  document_number text,
  document_type text DEFAULT 'CPF',
  roles text[] DEFAULT '{Cliente}',
  address_city text,
  address_state text,
  address_street text,
  address_neighborhood text,
  address_zip text,
  notes text,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for clients table
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "tenant_isolation_clients" ON public.clients;
DROP POLICY IF EXISTS "superadmin_all_clients" ON public.clients;

-- Tenant isolation policy
CREATE POLICY "tenant_isolation_clients" ON public.clients
  FOR ALL USING (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  );

-- Superadmin bypass
CREATE POLICY "superadmin_all_clients" ON public.clients
  FOR ALL USING (public.is_superadmin());

-- Grants
GRANT ALL ON public.clients TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 3. Add updated_at trigger for clients
CREATE OR REPLACE FUNCTION public.handle_clients_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_clients_updated ON public.clients;
CREATE TRIGGER on_clients_updated
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_clients_updated_at();
