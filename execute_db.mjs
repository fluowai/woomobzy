import pg from 'pg';
import fs from 'fs';

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  let sql = fs.readFileSync('FULL_DATABASE_SCHEMA.sql', 'utf8');
  const client = await pool.connect();
  console.log(
    'Connected to DB. Resetting public schema and executing schema...'
  );
  try {
    await client.query(
      'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres, public;'
    );
    await client.query(sql);
    console.log('Schema executed successfully!');
  } catch (err) {
    console.error('Execution failed:', err.message);
    console.error('At line:', err.position);
  } finally {
    client.release();
    pool.end();
  }
}

run();
