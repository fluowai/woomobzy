import pg from 'pg';

const pool = new pg.Pool({
  connectionString:
    'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const client = await pool.connect();

    // Drop the recursive policy
    await client.query(`
      DROP POLICY IF EXISTS "Reseller view sub-organization users" ON public.profiles;
    `);

    // Create basic policies
    await client.query(`
      CREATE POLICY "Users can view own profile" ON public.profiles
      FOR SELECT USING (auth.uid() = id);
    `);

    await client.query(`
      CREATE POLICY "Mega admins can view all profiles" ON public.profiles
      FOR SELECT USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'MEGA_ADMIN' OR 
        role = 'MEGA_ADMIN' OR role = 'super_admin'
      );
    `);

    // Let's also check if there are other policies causing issues
    console.log('Replaced bad policy with safe ones!');
    client.release();
  } catch (err) {
    console.error('Error fixing RLS:', err);
  } finally {
    pool.end();
  }
}

run();
