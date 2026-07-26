import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL;

async function runMigration() {
  const client = new Client({ 
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('Connected to DB. Running migration...');
    await client.query(`ALTER TABLE whatsapp_instances ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'whatsmeow';`);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await client.end();
  }
}

runMigration();
