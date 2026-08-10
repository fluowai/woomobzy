-- ============================================================================
-- Migration: Fix properties RLS (client-side reads returning empty)
-- Date: 2026-08-08
--
-- Problem:
--   The `properties` table has RLS ENABLED but no policies in the live
--   database. With RLS enabled and zero policies, every read made by the
--   `anon`/`authenticated` roles through PostgREST is denied (returns []),
--   so client-side queries (e.g. the "Selecionar Imóvel" step in the lease
--   wizard, dashboards) never list properties. Only the server (service role)
--   could read them, which is why properties showed up in PropertyManagement
--   but not in the lease contract selector.
--
-- Fix:
--   Restore the intended policies (same as 20260618_consolidate_crm_rls.sql):
--     - "Tenant isolation properties"  -> authenticated users see/own their org
--     - "Public read available properties" -> anon can read available listings
-- ============================================================================

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation properties" ON public.properties;
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
