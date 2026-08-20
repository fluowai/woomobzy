const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.epgaftsjmqmpczvzsrcc',
  password: 'Ru3fxgGYHMepMYm3',
  database: 'postgres',
  ssl: { rejectUnauthorized: false, sslmode: 'require' }
});

pool.connect().then(async client => {
  try {
    // Executar as alterações RLS diretamente via pg
    await client.query(`
      ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
      CREATE POLICY service_role_all_properties ON properties FOR ALL USING (true) WITH CHECK (true);
      ALTER TABLE ai_execution_logs ENABLE ROW LEVEL SECURITY;
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_ai_execution_logs' AND tablename = 'ai_execution_logs') THEN
          CREATE POLICY service_role_all_ai_execution_logs ON ai_execution_logs FOR ALL USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_ai_execution_logs' AND tablename = 'ai_execution_logs') THEN
          CREATE POLICY tenant_ai_execution_logs ON ai_execution_logs FOR ALL USING (organization_id = get_my_org_id()) WITH CHECK (organization_id = get_my_org_id());
        END IF;
      END$$;
      SELECT get_my_org_id() AS current_org_id;
    `);
    console.log('✅ RLS policies executadas via pg client');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await pool.end();
  }
}).catch(err => {
  console.error('❌ Erro de conexão:', err.message);
});