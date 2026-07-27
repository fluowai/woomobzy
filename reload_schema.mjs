import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString:
    'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const res = await pool.query(`NOTIFY pgrst, 'reload schema';`);
    console.log('Successfully reloaded PostgREST schema cache!', res);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

run();
