import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const migrationFile = process.argv[2];
const rawConnectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!migrationFile) {
  console.error('Informe o arquivo SQL da migration.');
  process.exit(1);
}

if (!rawConnectionString && (!supabaseUrl || !serviceRoleKey)) {
  console.error('Configure SUPABASE_DB_URL/DATABASE_URL ou VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const sql = fs.readFileSync(migrationFile, 'utf8');

try {
  if (!rawConnectionString) {
    throw new Error('Direct database URL not configured.');
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
    await client.connect();
    await client.query(sql);
    console.log(`Migration aplicada via Postgres direto: ${migrationFile}`);
  } finally {
    await client.end();
  }
} catch (directError) {
  console.warn(`Postgres direto falhou (${directError.message}). Tentando RPC exec_sql...`);

  if (!supabaseUrl || !serviceRoleKey) {
    throw directError;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    throw new Error(`RPC exec_sql falhou: ${error.message}`);
  }

  console.log(`Migration aplicada via RPC exec_sql: ${migrationFile}`);
}
