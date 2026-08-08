import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('No DATABASE_URL found in .env');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  let sql = fs.readFileSync('migrations/20260803_system_contracts.sql', 'utf8');
  const client = await pool.connect();
  console.log('Connected to DB. Executing migration...');
  try {
    await client.query(sql);
    console.log('Migration executed successfully!');
  } catch (err) {
    console.error('Execution failed:', err.message);
    if (err.position) {
      console.error('At position:', err.position);
    }
  } finally {
    client.release();
    pool.end();
  }
}

run();
