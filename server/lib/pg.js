import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const connectionString =
  process.env.DATABASE_URL ||
  process.env.VITE_SUPABASE_URL?.replace(
    'https://',
    'postgresql://postgres:'
  ).replace('.supabase.co', '.supabase.co:5432/postgres');

// Note: If using Supabase, you usually need to use the connection string from their dashboard.
// We assume DATABASE_URL is provided for direct PG access.

const rawUrl = connectionString || '';
const useSsl =
  process.env.NODE_ENV === 'production' ||
  process.env.PGSSLMODE === 'require' ||
  /supabase\.(co|com)|sslmode=require/i.test(rawUrl);

const pool = new Pool({
  connectionString: rawUrl || undefined,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

export const db = {
  query: (text, params) => pool.query(text, params),
  pool,
};
