import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
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
