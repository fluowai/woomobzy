-- Fix RLS das tabelas do módulo urban: alinhar ao padrão CRM
-- (get_my_org_id() OR is_superadmin()) para permitir impersonação de superadmin.
-- Causa: 403 no INSERT de urban_financing_simulations quando superadmin impersona org
-- (a policy antiga exigia organization_id do perfil real do auth.uid()).

-- Garantir helpers canônicos (idempotente)
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

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'superadmin'
  );
$$;

-- urban_lots
DROP POLICY IF EXISTS "Tenant isolation urban_lots" ON public.urban_lots;
CREATE POLICY "Tenant isolation urban_lots" ON public.urban_lots
  FOR ALL TO authenticated
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

-- key_control
DROP POLICY IF EXISTS "Tenant isolation key_control" ON public.key_control;
CREATE POLICY "Tenant isolation key_control" ON public.key_control
  FOR ALL TO authenticated
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

-- condominiums
DROP POLICY IF EXISTS "Tenant isolation condominiums" ON public.condominiums;
CREATE POLICY "Tenant isolation condominiums" ON public.condominiums
  FOR ALL TO authenticated
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

-- condominium_tickets
DROP POLICY IF EXISTS "Tenant isolation condominium_tickets" ON public.condominium_tickets;
CREATE POLICY "Tenant isolation condominium_tickets" ON public.condominium_tickets
  FOR ALL TO authenticated
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

-- urban_documents
DROP POLICY IF EXISTS "Tenant isolation urban_documents" ON public.urban_documents;
CREATE POLICY "Tenant isolation urban_documents" ON public.urban_documents
  FOR ALL TO authenticated
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

-- urban_portal_integrations
DROP POLICY IF EXISTS "Tenant isolation urban_portal_integrations" ON public.urban_portal_integrations;
CREATE POLICY "Tenant isolation urban_portal_integrations" ON public.urban_portal_integrations
  FOR ALL TO authenticated
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

-- urban_portal_sync_logs
DROP POLICY IF EXISTS "Tenant isolation urban_portal_sync_logs" ON public.urban_portal_sync_logs;
CREATE POLICY "Tenant isolation urban_portal_sync_logs" ON public.urban_portal_sync_logs
  FOR ALL TO authenticated
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

-- urban_financing_simulations (origem do 403 em /urban/simulador)
DROP POLICY IF EXISTS "Tenant isolation urban_financing_simulations" ON public.urban_financing_simulations;
CREATE POLICY "Tenant isolation urban_financing_simulations" ON public.urban_financing_simulations
  FOR ALL TO authenticated
  USING (organization_id = public.get_my_org_id() OR public.is_superadmin())
  WITH CHECK (organization_id = public.get_my_org_id() OR public.is_superadmin());

-- urban_property_favorites (mantém profile_id = auth.uid(), org liberada p/ superadmin)
DROP POLICY IF EXISTS "Profile favorites" ON public.urban_property_favorites;
CREATE POLICY "Profile favorites" ON public.urban_property_favorites
  FOR ALL TO authenticated
  USING (
    profile_id = auth.uid()
    AND (organization_id = public.get_my_org_id() OR public.is_superadmin())
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND (organization_id = public.get_my_org_id() OR public.is_superadmin())
  );
