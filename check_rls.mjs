import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const { rows } = await pool.query(`
    SELECT polname, pg_get_expr(polqual, polrelid) as polqual, pg_get_expr(polwithcheck, polrelid) as polwithcheck
    FROM pg_policy
    WHERE polrelid = 'public.profiles'::regclass;
  `);
  console.log('Profiles RLS:', rows);

  const { rows: userRows } = await pool.query(`
    SELECT polname, pg_get_expr(polqual, polrelid) as polqual, pg_get_expr(polwithcheck, polrelid) as polwithcheck
    FROM pg_policy
    WHERE polrelid = 'public."User"'::regclass;
  `);
  console.log('User RLS:', userRows);

  pool.end();
}

run();
