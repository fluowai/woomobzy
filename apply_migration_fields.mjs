import pg from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const sqlPath = path.join(
    process.cwd(),
    'migrations',
    '20260729_add_complete_fields_organizations.sql'
  );
  let sql = fs.readFileSync(sqlPath, 'utf8');
  const client = await pool.connect();
  console.log('Applying migration...');
  try {
    await client.query(sql);
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Execution failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

run();
