import pg from 'pg';

const pool = new pg.Pool({
  connectionString:
    'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const client = await pool.connect();

    // Create the security definer function
    await client.query(`
      CREATE OR REPLACE FUNCTION public.get_auth_organization_id()
      RETURNS uuid
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT organization_id FROM public.profiles WHERE id = auth.uid();
      $$;
    `);

    // Drop the recursive policy
    await client.query(`
      DROP POLICY IF EXISTS "Reseller view sub-organization users" ON public.profiles;
    `);

    // Recreate it using the non-recursive function
    await client.query(`
      CREATE POLICY "Reseller view sub-organization users" ON public.profiles
      FOR SELECT
      TO authenticated
      USING (
        organization_id IN (
          SELECT id FROM organizations WHERE parent_id = public.get_auth_organization_id()
        )
      );
    `);

    console.log('Fixed RLS infinite recursion successfully!');
    client.release();
  } catch (err) {
    console.error('Error fixing RLS:', err);
  } finally {
    pool.end();
  }
}

run();
