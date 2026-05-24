import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const migrationFile = process.argv[2];
const rawConnectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!migrationFile) {
  console.error('Informe o arquivo SQL da migration.');
  process.exit(1);
}

if (!rawConnectionString) {
  console.error('SUPABASE_DB_URL ou DATABASE_URL nao configurada.');
  process.exit(1);
}

const connectionUrl = new URL(rawConnectionString);
connectionUrl.searchParams.delete('sslmode');
connectionUrl.searchParams.delete('sslcert');
connectionUrl.searchParams.delete('sslkey');
connectionUrl.searchParams.delete('sslrootcert');

const client = new pg.Client({
  connectionString: connectionUrl.toString(),
  ssl: { rejectUnauthorized: false },
});

try {
  const sql = fs.readFileSync(migrationFile, 'utf8');
  await client.connect();
  await client.query(sql);
  console.log(`Migration aplicada: ${migrationFile}`);
} finally {
  await client.end();
}
