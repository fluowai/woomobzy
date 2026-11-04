import pg from 'pg';

const connectionString = 'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Dropping bad profiles policies...');
    
    // We drop the policies that are causing recursion
    await client.query(`
      DROP POLICY IF EXISTS "Mega admins can view all profiles" ON profiles;
      DROP POLICY IF EXISTS "Profiles isolation" ON profiles;
      DROP POLICY IF EXISTS "Reseller view sub-organization users" ON profiles;
      DROP POLICY IF EXISTS "profiles_select_same_org_or_reseller_or_mega" ON profiles;
      
      -- Replace with a safe, non-recursive read policy for profiles
      -- 1. Users can see their own profile
      -- 2. Users in the same organization can see each other
      -- 3. Platform admins can see everyone (using the SECURITY DEFINER function)
      
      CREATE OR REPLACE FUNCTION is_platform_admin_safe() RETURNS BOOLEAN AS $$
      BEGIN
        -- Bypasses RLS to check role
        RETURN EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role IN ('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'superadmin')
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      CREATE OR REPLACE FUNCTION get_auth_org_id() RETURNS UUID AS $$
      DECLARE
        org_id UUID;
      BEGIN
        SELECT organization_id INTO org_id FROM profiles WHERE id = auth.uid();
        RETURN org_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Recreate basic safe select policy
      CREATE POLICY "Profiles safe select" ON profiles 
      FOR SELECT 
      USING (
        id = auth.uid() 
        OR organization_id = get_auth_org_id()
        OR is_platform_admin_safe()
      );
      
    `);
    
    console.log('Fixed profiles RLS recursion.');
  } catch (err) {
    console.error('Execution failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
