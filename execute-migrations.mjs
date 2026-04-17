import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function runAllMigrations() {
  const migrations = [
    'create_exec_sql.sql',
    'definitive_imobzy_schema.sql',
    'fix_role_and_permissions_v2.sql',
    'fix_rpc_final.sql',
    'fix_landing_pages_rls.sql',
    'setup_landing_pages.sql',
    'seed_admin_user.sql',
  ];

  console.log('🚀 Executando migrações...\n');

  for (let i = 0; i < migrations.length; i++) {
    const file = migrations[i];
    console.log(`[${i + 1}/${migrations.length}] ${file}`);

    if (!fs.existsSync(file)) {
      console.log(`❌ Arquivo não encontrado: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(file, 'utf-8');
    const result = await executeSQL(sql);

    if (result.error) {
      console.log(`❌ Erro: ${JSON.stringify(result.error)}`);
    } else {
      console.log(`✅ Sucesso`);
    }
  }

  console.log('\n🎉 Migrações concluídas!');
}

runAllMigrations();