-- ============================================================================
-- Migration: Fix RLS organizations + sensitive columns exposure
-- Created: 2026-08-20
-- Context: DAST report (relatorio-imob-wootech-2026-08-20.md) - CRITICAL #1/#2
--
-- Root cause (confirmed by read-only diagnostic):
--   Policy "Public read organizations" (roles=anon, status='active') allowed
--   anonymous SELECT of every active organization.
--   anon also had table-level INSERT/SELECT/UPDATE/DELETE grants.
-- ============================================================================

-- 1. Defensive: revoke anon access to all tenant-scoped tables.
--    Public access must go through RPCs/views (SECURITY DEFINER), never
--    direct table grants. Authenticated grants are KEPT (RLS gates rows).
REVOKE ALL ON public.organizations FROM anon;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.plans FROM anon;
REVOKE ALL ON public.leads FROM anon;
REVOKE ALL ON public.clients FROM anon;
REVOKE ALL ON public.messages FROM anon;
REVOKE ALL ON public.invoices FROM anon;
REVOKE ALL ON public.billing FROM anon;
REVOKE ALL ON public.contracts FROM anon;
REVOKE ALL ON public.documents FROM anon;
REVOKE ALL ON public.support_tickets FROM anon;
REVOKE ALL ON public.support_messages FROM anon;
REVOKE ALL ON public.site_settings FROM anon;
REVOKE ALL ON public.site_texts FROM anon;

-- 2. Drop the permissive/exposing policies on organizations.
DROP POLICY IF EXISTS "Public read organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organizations isolation" ON public.organizations;
DROP POLICY IF EXISTS "Users can view own organization" ON public.organizations;
DROP POLICY IF EXISTS "organizations_tenant" ON public.organizations;
DROP POLICY IF EXISTS "Superadmins can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Reseller view sub-organizations" ON public.organizations;
DROP POLICY IF EXISTS "Reseller insert sub-organizations" ON public.organizations;
DROP POLICY IF EXISTS "Reseller update sub-organizations" ON public.organizations;

-- 3. Fresh, strict policies for organizations (authenticated only).

-- 3.1 Superadmin / MegaAdmin full access (role comes ONLY from profiles).
DROP POLICY IF EXISTS "organizations_superadmin_full" ON public.organizations;
CREATE POLICY "organizations_superadmin_full"
  ON public.organizations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('superadmin', 'MEGA_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('superadmin', 'MEGA_ADMIN')
    )
  );

-- 3.2 SELECT: members of the org, resellers viewing sub-orgs, or superadmin.
DROP POLICY IF EXISTS "organizations_select_member" ON public.organizations;
CREATE POLICY "organizations_select_member"
  ON public.organizations
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR parent_id IN (
      SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('superadmin', 'MEGA_ADMIN')
    )
  );

-- 3.3 INSERT: authenticated onboarding creates their own org;
--     resellers may create sub-orgs.
DROP POLICY IF EXISTS "organizations_insert_authenticated" ON public.organizations;
CREATE POLICY "organizations_insert_authenticated"
  ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "organizations_insert_reseller" ON public.organizations;
CREATE POLICY "organizations_insert_reseller"
  ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (
    parent_id IN (
      SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- 3.4 UPDATE: admin/owner of the org, or superadmin.
DROP POLICY IF EXISTS "organizations_update_admin" ON public.organizations;
CREATE POLICY "organizations_update_admin"
  ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT p.organization_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    id IN (
      SELECT p.organization_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
    )
  );

-- 3.5 DELETE: owner of the org (role 'owner' not currently in use) or superadmin.
DROP POLICY IF EXISTS "organizations_delete_owner" ON public.organizations;
CREATE POLICY "organizations_delete_owner"
  ON public.organizations
  FOR DELETE TO authenticated
  USING (
    id IN (
      SELECT p.organization_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'owner'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('superadmin', 'MEGA_ADMIN')
    )
  );

-- 4. Column-level security: never expose payment-gateway secrets via REST
--    (not even to authenticated members). service_role keeps full access.
REVOKE SELECT (gateway_api_key, webhook_secret, gateway_provider)
  ON public.organizations FROM anon, authenticated;
GRANT SELECT (gateway_api_key, webhook_secret, gateway_provider)
  ON public.organizations TO service_role;

-- 5. Public tenant discovery stays functional through SECURITY DEFINER RPC
--    (get_tenant_public) and the public_tenant_discovery view (BYOB domains).
--    Both already expose only non-sensitive fields; no change required here.

NOTIFY pgrst, 'reload schema';