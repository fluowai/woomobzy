import pg from 'pg';

const pool = new pg.Pool({
  connectionString:
    'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
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
