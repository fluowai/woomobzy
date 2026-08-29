import pg from 'pg';

const connectionString = 'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Dropping bad organizations policies...');
    
    await client.query(`
      DROP POLICY IF EXISTS "Public read organizations" ON organizations;
      DROP POLICY IF EXISTS "Reseller can see sub-organizations" ON organizations;
      DROP POLICY IF EXISTS "Reseller view sub-organizations" ON organizations;
      DROP POLICY IF EXISTS "organizations_mega_full" ON organizations;
      DROP POLICY IF EXISTS "organizations_select_scoped" ON organizations;
      
      -- We will recreate a safe SELECT policy for organizations
      -- 1. Anyone can see their own organization (via get_auth_org_id)
      -- 2. Platform Admins can see everything (via is_platform_admin_safe)
      -- 3. Resellers can see organizations where parent_id matches their org (no recursion needed here, just check parent_id = get_auth_org_id())

      CREATE POLICY "Organizations safe select" ON organizations 
      FOR SELECT 
      USING (
        id = get_auth_org_id() 
        OR parent_id = get_auth_org_id()
        OR is_platform_admin_safe()
      );
      
    `);
    
    console.log('Fixed organizations RLS recursion.');
  } catch (err) {
    console.error('Execution failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
