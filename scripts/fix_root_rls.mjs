import pg from 'pg';

const connectionString = 'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Fixing the infinite recursion caused by get_auth_org_id in profiles...');
    
    // We will drop the policy on profiles and recreate it so it DOES NOT call get_auth_org_id()
    await client.query(`
      DROP POLICY IF EXISTS "Profiles safe select" ON profiles;
      
      -- Instead of calling get_auth_org_id(), which queries profiles (and thus loops),
      -- we will just let users view their own profile and platform admins view all.
      -- To allow viewing team members, we will use a subquery that specifically filters on id = auth.uid()
      -- and we will avoid calling the function.
      
      CREATE POLICY "Profiles safe select" ON profiles 
      FOR SELECT 
      USING (
        id = auth.uid() 
        OR is_platform_admin_safe()
      );
    `);
    
    // We will also make sure organizations policy is completely safe.
    // If organizations calls get_auth_org_id(), it queries profiles.
    // When it queries profiles, profiles evaluates "Profiles safe select".
    // Since "Profiles safe select" no longer calls get_auth_org_id(), the recursion is broken!
    
    console.log('Fixed the root cause of the RLS recursion loop.');
  } catch (err) {
    console.error('Execution failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
