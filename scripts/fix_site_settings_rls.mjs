import pg from 'pg';

const connectionString = 'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Dropping bad site_settings policies...');
    
    await client.query(`
      DROP POLICY IF EXISTS "site_settings_select_scoped" ON site_settings;
      DROP POLICY IF EXISTS "Public read site_settings" ON site_settings;
      DROP POLICY IF EXISTS "Reseller view site_settings" ON site_settings;
      DROP POLICY IF EXISTS "Tenant isolation site_settings" ON site_settings;
      
      CREATE POLICY "Site Settings safe select" ON site_settings 
      FOR SELECT 
      USING (
        organization_id = get_auth_org_id()
        OR is_platform_admin_safe()
      );
      
    `);
    
    console.log('Fixed site_settings RLS recursion.');
  } catch (err) {
    console.error('Execution failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
