import fs from 'node:fs/promises';
import pg from 'pg';

const sql = await fs.readFile('migrations/20260520_properties_schema_alignment.sql', 'utf8');
const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_PRIVATE_URL ||
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL, SUPABASE_DB_URL, DATABASE_PRIVATE_URL, DIRECT_URL or POSTGRES_URL is required');
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
await client.query(sql);
await client.end();

console.log('properties schema aligned');
