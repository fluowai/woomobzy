import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const { rows } = await pool.query(`
    SELECT grantee, privilege_type 
    FROM information_schema.role_table_grants 
    WHERE table_name = 'profiles';
  `);
  console.log('Profiles Grants:', rows);
  pool.end();
}

run();
