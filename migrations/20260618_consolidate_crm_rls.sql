-- Consolidate CRM tenant policies. Service-role traffic bypasses RLS.

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
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

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brokers can manage leads in organization" ON public.leads;
DROP POLICY IF EXISTS "Tenant isolation for leads" ON public.leads;
DROP POLICY IF EXISTS "Tenant isolation leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view leads in organization" ON public.leads;
DROP POLICY IF EXISTS "leads_isolation" ON public.leads;
DROP POLICY IF EXISTS "tenant_leads" ON public.leads;

CREATE POLICY "Tenant isolation leads" ON public.leads
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  )
  WITH CHECK (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "Brokers can manage properties in organization" ON public.properties;
DROP POLICY IF EXISTS "Tenant isolation for properties" ON public.properties;
DROP POLICY IF EXISTS "Tenant isolation properties" ON public.properties;
DROP POLICY IF EXISTS "Users can view properties in organization" ON public.properties;
DROP POLICY IF EXISTS "tenant_properties" ON public.properties;
DROP POLICY IF EXISTS "Public read available properties" ON public.properties;

CREATE POLICY "Tenant isolation properties" ON public.properties
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  )
  WITH CHECK (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  );

CREATE POLICY "Public read available properties" ON public.properties
  FOR SELECT TO anon
  USING (status IN ('Disponivel', 'Disponível', 'available', 'publicado'));

DROP POLICY IF EXISTS "Service role full access on lead_tags" ON public.lead_tags;
DROP POLICY IF EXISTS "Tenant isolation lead_tags" ON public.lead_tags;

CREATE POLICY "Tenant isolation lead_tags" ON public.lead_tags
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  )
  WITH CHECK (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "Users can insert activities in their organization" ON public.lead_activities;
DROP POLICY IF EXISTS "Users can see activities of their organization" ON public.lead_activities;
DROP POLICY IF EXISTS "Tenant isolation lead_activities" ON public.lead_activities;

CREATE POLICY "Tenant isolation lead_activities" ON public.lead_activities
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  )
  WITH CHECK (
    organization_id = public.get_my_org_id()
    OR public.is_superadmin()
  );

ANALYZE public.leads;
ANALYZE public.properties;
ANALYZE public.lead_tags;
ANALYZE public.lead_activities;
