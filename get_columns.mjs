import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'profiles';
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  pool.end();
}

run();
