import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no .env');
  process.exit(1);
}

async function executeSQL(sql) {
  try {
    const response = await axios.post(
      `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      { sql },
      {
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    return { error: error.response?.data || error.message };
  }
}

async function runFix() {
  const file = 'sql/fix_niche_and_isolation.sql';
  console.log(`🚀 Executando correção: ${file}...`);

  if (!fs.existsSync(file)) {
    console.error(`❌ Arquivo não encontrado: ${file}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(file, 'utf-8');
  const result = await executeSQL(sql);

  if (result && result.error) {
    console.error(`❌ Erro ao executar SQL:`, JSON.stringify(result.error, null, 2));
    
    if (result.error.message && result.error.message.includes('function "exec_sql" does not exist')) {
        console.log('\n⚠️  A função RPC "exec_sql" não existe no seu Supabase.');
        console.log('Por favor, execute o conteúdo de sql/fix_niche_and_isolation.sql manualmente no SQL Editor do Supabase.');
    }
  } else {
    console.log(`✅ Sucesso! Mudanças de banco de dados aplicadas.`);
  }
}

runFix();
