import pg from 'pg';

const pool = new pg.Pool({
  connectionString:
    'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const { rows } = await pool.query(`
    SELECT email, raw_app_meta_data 
    FROM auth.users 
    WHERE email = 'fluowai@gmail.com';
  `);
  console.log('User Auth Data:', JSON.stringify(rows, null, 2));
  pool.end();
}

run();
