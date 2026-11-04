import pg from 'pg';

const pool = new pg.Pool({
  connectionString:
    'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const res = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public';`
    );
    console.log(res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

run();
