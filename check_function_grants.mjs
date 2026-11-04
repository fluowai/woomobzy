import pg from 'pg';

const pool = new pg.Pool({
  connectionString:
    'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const { rows } = await pool.query(`
      SELECT has_function_privilege('authenticated', 'public.get_auth_organization_id()', 'execute') as has_exec;
    `);
    console.log('Has execute:', rows[0].has_exec);

    if (!rows[0].has_exec) {
      console.log('Granting EXECUTE on public.get_auth_organization_id()...');
      await pool.query(
        `GRANT EXECUTE ON FUNCTION public.get_auth_organization_id() TO authenticated;`
      );
      await pool.query(
        `GRANT EXECUTE ON FUNCTION public.get_auth_organization_id() TO anon;`
      );
      console.log('Granted.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

run();
