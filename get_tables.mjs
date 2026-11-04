import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log(JSON.stringify(res.rows.map(r => r.table_name), null, 2));
  pool.end();
}

run();
