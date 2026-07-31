import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
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
