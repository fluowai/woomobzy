import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const rawConnectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!rawConnectionString) {
  console.error('SUPABASE_DB_URL ou DATABASE_URL nao configurada.');
  process.exit(1);
}

const connectionUrl = new URL(rawConnectionString);
connectionUrl.searchParams.delete('sslmode');
connectionUrl.searchParams.delete('sslcert');
connectionUrl.searchParams.delete('sslkey');
connectionUrl.searchParams.delete('sslrootcert');

const sql = fs.readFileSync('migrations/20260520_site_settings_schema_alignment.sql', 'utf8');
const client = new pg.Client({
  connectionString: connectionUrl.toString(),
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log('site_settings alinhada com sucesso.');
} finally {
  await client.end();
}
