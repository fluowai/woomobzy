import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
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
