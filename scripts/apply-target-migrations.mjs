import fs from 'node:fs/promises';
import pg from 'pg';

const files = [
  'sql/definitive_imobzy_schema.sql',
  'sql/fix_role_and_permissions_v2.sql',
  'sql/fix_rpc_final.sql',
  'sql/fix_landing_pages_rls.sql',
  'sql/setup_landing_pages.sql',
  'migrations/v6_rural_search_logs.sql',
  'migrations/20260530_fluowai_cloud_migration_control.sql',
  'migrations/20260516_ai_agents_whatsapp_automation.sql',
  'migrations/20260603_whatsapp_media_pipeline.sql',
  'migrations/20260604_email_center.sql',
  'migrations/20260725_add_indexes_reseller.sql',
  'migrations/20260725_reseller_infrastructure.sql',
  'migrations/20260819_rls_policies_and_indexes.sql',
  'migrations/20260820_fix_rls_organizations_and_sensitive_columns.sql',
  'migrations/20260820_ai_workforce_builder.sql',
  'migrations/20260821_captacao_leads.sql',
  'migrations/20260821_ai_workforce_builder_compat.sql',
  'migrations/20260822_ai_execution_logs.sql',
  'migrations/20260823_fix_profiles_rls_recursion.sql',
  'migrations/20260823_fix_reseller_tenant_isolation.sql',
  'migrations/20260824_add_gemini_key_to_saas_settings.sql',
  'migrations/20260825_add_ai_provider_keys_to_saas_settings.sql',
  'migrations/20260826_enhance_condominios.sql',
  'migrations/20260826_loteamentos_mockup.sql',
  'migrations/20260826_signature_fields.sql',
  'migrations/20260826_social_media_schema.sql',
  'migrations/20260826_whatsapp_cloud_api_billing.sql',
  'migrations/20260827_add_asgardpay_keys_to_organizations.sql',
  'migrations/20260827_ai_sandbox_fixes.sql',
];

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 20000 });
await client.connect();
for (const file of files) {
  const sql = await fs.readFile(file, 'utf8');
  if (!sql.trim()) continue;
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`OK ${file}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`FAIL ${file}: ${error.message}`);
  }
}
await client.end();
