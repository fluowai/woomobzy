-- ========================================================================
-- Migration: RLS Policies & Composite Indexes for Tenant Isolation
-- Created: 2026-08-19
-- ========================================================================

-- Enable RLS on all tenant-scoped tables (if not already enabled)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparable_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_handoff_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_metrics_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.due_diligence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_file_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_table_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_config_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rural_location_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_external_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_polygons ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- RLS Policies: Tenant Isolation
-- All policies use: organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
-- ========================================================================

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
        -- Drop existing policy if exists
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', tbl);
        
        -- Create tenant isolation policy
        EXECUTE format($policy$
            CREATE POLICY "tenant_isolation" ON public.%I
            FOR ALL
            USING (
                organization_id = (
                    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
                )
            )
            WITH CHECK (
                organization_id = (
                    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
                )
            );
        $policy$, tbl);
    END LOOP;
END $$;

-- Superadmin/megaadmin bypass policy for all tenant tables
-- Uses normalizeRole-equivalent check: superadmin, super_admin, megaadmin, mega_admin
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
        EXECUTE format('DROP POLICY IF EXISTS "superadmin_bypass" ON public.%I', tbl);
        EXECUTE format($policy$
            CREATE POLICY "superadmin_bypass" ON public.%I
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND 
                    (
                        role = 'superadmin' OR
                        role = 'super_admin' OR
                        role = 'megaadmin' OR
                        role = 'mega_admin'
                    )
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND 
                    (
                        role = 'superadmin' OR
                        role = 'super_admin' OR
                        role = 'megaadmin' OR
                        role = 'mega_admin'
                    )
                )
            );
        $policy$, tbl);
    END LOOP;
END $$;

-- Special policies for profiles table (self + superadmin)
DROP POLICY IF EXISTS "profiles_self" ON public.profiles;
CREATE POLICY "profiles_self" ON public.profiles
FOR SELECT USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'));

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Special policies for organizations table
DROP POLICY IF EXISTS "organizations_tenant" ON public.organizations;
CREATE POLICY "organizations_tenant" ON public.organizations
FOR SELECT USING (
    id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- Reseller policies for organizations (already exist in schema, keeping them)
-- Reseller can see sub-organizations
DROP POLICY IF EXISTS "Reseller view sub-organizations" ON public.organizations;
CREATE POLICY "Reseller view sub-organizations" ON public.organizations
FOR SELECT
USING (
    parent_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
);

-- ========================================================================
-- Composite Indexes for Query Performance
-- ========================================================================

-- leads: common filters - organization_id + status + created_at
CREATE INDEX IF NOT EXISTS idx_leads_org_status_created 
ON public.leads (organization_id, status, created_at DESC);

-- leads: property matching
CREATE INDEX IF NOT EXISTS idx_leads_org_property 
ON public.leads (organization_id, property_id) 
WHERE property_id IS NOT NULL;

-- properties: common filters - organization_id + status + niche
CREATE INDEX IF NOT EXISTS idx_properties_org_status_niche 
ON public.properties (organization_id, status, niche);

-- properties: broker assignment
CREATE INDEX IF NOT EXISTS idx_properties_org_broker 
ON public.properties (organization_id, broker_id) 
WHERE broker_id IS NOT NULL;

-- rental_contracts: organization + status + payment_status
CREATE INDEX IF NOT EXISTS idx_rental_contracts_org_status_payment 
ON public.rental_contracts (organization_id, status, payment_status);

-- rental_contracts: due date queries
CREATE INDEX IF NOT EXISTS idx_rental_contracts_org_due_date 
ON public.rental_contracts (organization_id, due_day) 
WHERE status = 'active';

-- billing: organization + status + due_date
CREATE INDEX IF NOT EXISTS idx_billing_org_status_due 
ON public.billing (organization_id, status, due_date);

-- billing: contract lookup
CREATE INDEX IF NOT EXISTS idx_billing_org_contract 
ON public.billing (organization_id, contract_id) 
WHERE contract_id IS NOT NULL;

-- whatsapp_messages: instance + chat + timestamp (high volume)
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance_chat_ts 
ON public.whatsapp_messages (instance_id, chat_id, timestamp DESC);

-- whatsapp_messages: delivery status
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_delivery 
ON public.whatsapp_messages (instance_id, delivery_status) 
WHERE delivery_status IN ('sent', 'delivered', 'read');

-- whatsapp_chats: instance + last_message_at
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_instance_last_msg 
ON public.whatsapp_chats (instance_id, last_message_at DESC);

-- lead_activities: lead + created_at
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_created 
ON public.lead_activities (lead_id, created_at DESC);

-- lead_activities: organization + created_at
CREATE INDEX IF NOT EXISTS idx_lead_activities_org_created 
ON public.lead_activities (organization_id, created_at DESC);

-- contracts: organization + status
CREATE INDEX IF NOT EXISTS idx_contracts_org_status 
ON public.contracts (organization_id, status);

-- documents: organization + property + status
CREATE INDEX IF NOT EXISTS idx_documents_org_property_status 
ON public.documents (organization_id, property_id, status);

-- documents: sha256 for deduplication
CREATE INDEX IF NOT EXISTS idx_documents_sha256 
ON public.documents (sha256) WHERE sha256 IS NOT NULL;

-- email_accounts: organization + is_active
CREATE INDEX IF NOT EXISTS idx_email_accounts_org_active 
ON public.email_accounts (organization_id, is_active) 
WHERE is_active = true;

-- emails: account + folder + date
CREATE INDEX IF NOT EXISTS idx_emails_account_folder_date 
ON public.emails (account_id, folder, date DESC);

-- emails: thread grouping
CREATE INDEX IF NOT EXISTS idx_emails_thread 
ON public.emails (thread_id) WHERE thread_id IS NOT NULL;

-- landing_pages: organization + is_active + status
CREATE INDEX IF NOT EXISTS idx_landing_pages_org_active_status 
ON public.landing_pages (organization_id, is_active, status);

-- quiz_campaigns: organization + status
CREATE INDEX IF NOT EXISTS idx_quiz_campaigns_org_status 
ON public.quiz_campaigns (organization_id, status);

-- quiz_submissions: campaign + qualification_status
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_campaign_qual 
ON public.quiz_submissions (campaign_id, qualification_status);

-- storage_objects: tenant + bucket + deleted_at
CREATE INDEX IF NOT EXISTS idx_storage_objects_tenant_bucket 
ON public.storage_objects (tenant_id, bucket, deleted_at) 
WHERE deleted_at IS NULL;

-- environments: organization + is_primary
CREATE INDEX IF NOT EXISTS idx_environments_org_primary 
ON public.environments (organization_id, is_primary) 
WHERE is_primary = true;

-- price_history: property + created_at
CREATE INDEX IF NOT EXISTS idx_price_history_property_created 
ON public.price_history (property_id, created_at DESC);

-- property_valuations: property + triggered_at
CREATE INDEX IF NOT EXISTS idx_property_valuations_property_triggered 
ON public.property_valuations (property_id, triggered_at DESC);

-- comparable_sales: city + state + sale_date
CREATE INDEX IF NOT EXISTS idx_comparable_sales_location_date 
ON public.comparable_sales (city, state, sale_date DESC);

-- ai_agents: organization + is_active
CREATE INDEX IF NOT EXISTS idx_ai_agents_org_active 
ON public.ai_agents (organization_id, is_active) 
WHERE is_active = true;

-- agent_channels: tenant + agent + is_primary
CREATE INDEX IF NOT EXISTS idx_agent_channels_tenant_agent_primary 
ON public.agent_channels (tenant_id, agent_id, is_primary) 
WHERE is_primary = true;

-- agent_execution_logs: tenant + agent + executed_at
CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_tenant_agent_time 
ON public.agent_execution_logs (tenant_id, agent_id, executed_at DESC);

-- payment_history: contract + payment_date
CREATE INDEX IF NOT EXISTS idx_payment_history_contract_date 
ON public.payment_history (contract_id, payment_date DESC);

-- contract_renewals: contract + new_start_date
CREATE INDEX IF NOT EXISTS idx_contract_renewals_contract_start 
ON public.contract_renewals (contract_id, new_start_date DESC);

-- ibge_municipios: uf + nome (for search)
CREATE INDEX IF NOT EXISTS idx_ibge_municipios_uf_nome 
ON public.ibge_municipios (uf, nome);

-- profiles: organization_id for tenant lookup
CREATE INDEX IF NOT EXISTS idx_profiles_organization 
ON public.profiles (organization_id);

-- organizations: slug for subdomain lookup
CREATE INDEX IF NOT EXISTS idx_organizations_slug 
ON public.organizations (slug);

-- organizations: custom_domain for domain lookup
CREATE INDEX IF NOT EXISTS idx_organizations_custom_domain 
ON public.organizations (custom_domain) WHERE custom_domain IS NOT NULL;

-- organizations: parent_id for reseller hierarchy
CREATE INDEX IF NOT EXISTS idx_organizations_parent 
ON public.organizations (parent_id) WHERE parent_id IS NOT NULL;

-- ========================================================================
-- Partial indexes for common active-only queries
-- ========================================================================

-- Active properties only
CREATE INDEX IF NOT EXISTS idx_properties_active 
ON public.properties (organization_id, niche, location_city, location_state) 
WHERE status = 'Disponível';

-- Active rental contracts
CREATE INDEX IF NOT EXISTS idx_rental_contracts_active 
ON public.rental_contracts (organization_id, property_id, tenant_name) 
WHERE status = 'active';

-- Open billings only
CREATE INDEX IF NOT EXISTS idx_billing_open 
ON public.billing (organization_id, due_date) 
WHERE status = 'aberto';

-- Active whatsapp instances
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_active 
ON public.whatsapp_instances (tenant_id) 
WHERE status = 'connected';

-- ========================================================================
-- End of Migration
-- ========================================================================