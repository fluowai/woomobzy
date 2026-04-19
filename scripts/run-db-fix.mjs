import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('🚀 Executando migração SQL via RPC...');

  const sql = `
    ALTER TABLE whatsapp_instances 
    ADD COLUMN IF NOT EXISTS status_version BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMPTZ;
  `;

  const { error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('❌ Erro ao executar SQL:', error.message);
    if (error.message.includes('exec_sql')) {
        console.log('💡 Dica: A função RPC "exec_sql" não parece estar definida no Supabase.');
    }
  } else {
    console.log('✅ SQL executado com sucesso (Colunas status_version e last_connected_at garantidas).');
  }
}

run();
