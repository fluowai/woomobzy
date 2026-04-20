import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL ou SERVICE_ROLE_KEY ausentes.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('🚀 Atualizando esquema da tabela whatsapp_instances...');

  // Supabase JS client doesn't allow raw SQL easily unless we use a function or another library.
  // Since we have 'pg' in package.json, we can use that for raw SQL if needed,
  // but let's try to check if we can do it via the REST API or if we should use a script with 'pg'.

  // Actually, I'll use 'pg' since it's in package.json and more reliable for schema changes.
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    console.log('📦 Conectado ao banco. Executando comandos SQL...');

    await client.query(`
      ALTER TABLE whatsapp_instances 
      ADD COLUMN IF NOT EXISTS status_version BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMPTZ;
    `);

    console.log('✅ Colunas status_version e last_connected_at adicionadas com sucesso.');
    
    client.release();
  } catch (err) {
    console.error('❌ Erro ao atualizar esquema:', err.message);
  } finally {
    await pool.end();
  }
}

run();
