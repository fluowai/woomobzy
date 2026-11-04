-- ============================================================================
-- Migration: Fix reseller tenant isolation
-- Created: 2026-08-23
-- Context:
--   A reseller/superadmin must only manage their own child real-estate
--   organizations. Only the platform mega admin can read/manage globally.
-- ============================================================================

-- In RLS, public.is_superadmin() is the global platform bypass used by many
-- existing tenant policies. Keep the function name for compatibility, but make
-- it mean "mega admin" instead of "any reseller with role superadmin".
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.organizations o ON o.id = p.organization_id
    WHERE p.id = auth.uid()
      AND p.role IN ('superadmin', 'MEGA_ADMIN')
      AND (
        p.organization_id IS NULL
        OR COALESCE(o.is_reseller, false) = false
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_reseller_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.organizations o ON o.id = p.organization_id
    WHERE p.id = auth.uid()
      AND p.role = 'superadmin'
      AND COALESCE(o.is_reseller, false) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_reseller_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.organization_id
  FROM public.profiles p
  JOIN public.organizations o ON o.id = p.organization_id
  WHERE p.id = auth.uid()
    AND p.role = 'superadmin'
    AND COALESCE(o.is_reseller, false) = true
  LIMIT 1;
$$;

CREATE INDEX IF NOT EXISTS idx_organizations_parent_id
  ON public.organizations(parent_id);
CREATE INDEX IF NOT EXISTS idx_organizations_is_reseller
  ON public.organizations(is_reseller);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id_role
  ON public.profiles(organization_id, role);

DO $$
DECLARE
  tbl text;
  tenant_tables text[] := ARRAY[
    'leads', 'properties', 'rental_contracts', 'billing', 'clients',
    'lead_activities', 'contracts', 'documents', 'whatsapp_instances',
    'whatsapp_contacts', 'whatsapp_chats', 'whatsapp_messages', 'whatsapp_media',
    'email_accounts', 'emails', 'landing_pages', 'site_settings', 'site_texts',
    'developments', 'blocks', 'lots', 'billings', 'payment_history',
    'contract_renewals', 'property_valuations', 'valuation_rules', 'comparable_sales',
    'ai_agents', 'agent_channels', 'agent_workspaces', 'agent_triggers',
    'agent_permissions', 'agent_pipelines', 'agent_knowledge_sources',
    'agent_handoff_rules', 'agent_metrics_config', 'agent_simulations',
    'agent_execution_logs', 'due_diligence_items', 'instances', 'contacts',
    'domains', 'chat_messages', 'support_tickets', 'support_messages',
    'migration_jobs', 'migration_credentials', 'migration_steps', 'migration_logs',
    'migration_errors', 'migration_file_map', 'migration_table_map',
    'migration_config_snapshots', 'email_automation_jobs', 'email_events',
    'lead_tags', 'lead_followups', 'quiz_campaigns', 'quiz_submissions',
    'storage_objects', 'storage_inventory_snapshots', 'storage_admin_actions',
    'price_history', 'environments', 'rural_location_search_logs',
    'api_audit_logs', 'external_data_cache', 'document_analyses',
    'document_external_validations', 'property_polygons'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables
  LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "superadmin_bypass" ON public.%I', tbl);
      EXECUTE format(
        'CREATE POLICY "superadmin_bypass" ON public.%I FOR ALL TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin())',
        tbl
      );
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_superadmin_full" ON public.organizations;
DROP POLICY IF EXISTS "organizations_select_member" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert_reseller" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_admin" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete_owner" ON public.organizations;
DROP POLICY IF EXISTS "Superadmin full access organizations" ON public.organizations;
DROP POLICY IF EXISTS "Superadmins can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Reseller view sub-organizations" ON public.organizations;
DROP POLICY IF EXISTS "Reseller insert sub-organizations" ON public.organizations;
DROP POLICY IF EXISTS "Reseller update sub-organizations" ON public.organizations;

CREATE POLICY "organizations_mega_full"
  ON public.organizations
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY "organizations_select_scoped"
  ON public.organizations
  FOR SELECT TO authenticated
  USING (
    id = public.get_my_org_id()
    OR parent_id = public.get_reseller_org_id()
    OR public.is_superadmin()
  );

CREATE POLICY "organizations_insert_reseller_child"
  ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_superadmin()
    OR (
      public.is_reseller_admin()
      AND parent_id = public.get_reseller_org_id()
      AND COALESCE(is_reseller, false) = false
    )
  );

CREATE POLICY "organizations_update_scoped"
  ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    public.is_superadmin()
    OR id = public.get_my_org_id()
    OR (
      public.is_reseller_admin()
      AND parent_id = public.get_reseller_org_id()
      AND COALESCE(is_reseller, false) = false
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR id = public.get_my_org_id()
    OR (
      public.is_reseller_admin()
      AND parent_id = public.get_reseller_org_id()
      AND COALESCE(is_reseller, false) = false
    )
  );

CREATE POLICY "organizations_delete_scoped"
  ON public.organizations
  FOR DELETE TO authenticated
  USING (
    public.is_superadmin()
    OR (
      public.is_reseller_admin()
      AND parent_id = public.get_reseller_org_id()
      AND COALESCE(is_reseller, false) = false
    )
  );

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_same_org_or_reseller_or_mega" ON public.profiles;
CREATE POLICY "profiles_select_same_org_or_reseller_or_mega"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR organization_id = public.get_my_org_id()
    OR public.is_superadmin()
    OR (
      public.is_reseller_admin()
      AND organization_id IN (
        SELECT o.id
        FROM public.organizations o
        WHERE o.parent_id = public.get_reseller_org_id()
          AND COALESCE(o.is_reseller, false) = false
      )
    )
  );

DROP POLICY IF EXISTS "profiles_update_same_reseller_team" ON public.profiles;
CREATE POLICY "profiles_update_same_reseller_team"
  ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    public.is_superadmin()
    OR (
      public.is_reseller_admin()
      AND organization_id = public.get_reseller_org_id()
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR (
      public.is_reseller_admin()
      AND organization_id = public.get_reseller_org_id()
    )
  );

NOTIFY pgrst, 'reload schema';
