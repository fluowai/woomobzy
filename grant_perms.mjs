import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const client = await pool.connect();
    console.log('Granting permissions...');

    // Grant schema usage
    await client.query(
      `GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;`
    );

    // Grant all privileges on all tables in public schema
    await client.query(
      `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;`
    );

    // Grant all privileges on all sequences in public schema
    await client.query(
      `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;`
    );

    // Grant all privileges on all routines in public schema
    await client.query(
      `GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;`
    );

    // Reload schema
    await client.query(`NOTIFY pgrst, 'reload schema';`);

    console.log('Successfully granted permissions and reloaded schema!');
    client.release();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

run();
