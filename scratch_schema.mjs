import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await pool.query(`
    SELECT pg_get_constraintdef(c.oid) AS constraint_def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname IN ('organizations', 'profiles')
      AND c.contype = 'c';
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  pool.end();
}

run();
