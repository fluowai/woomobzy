import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const { rows } = await pool.query(`
    SELECT polname, pg_get_expr(polqual, polrelid) AS qual, pg_get_expr(polwithcheck, polrelid) AS withcheck 
    FROM pg_policy 
    WHERE polrelid = 'public.organizations'::regclass;
  `);
  console.log('Organizations Policies:', JSON.stringify(rows, null, 2));
  pool.end();
}

run();
