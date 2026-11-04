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

async function executeSQL(sql) {
  try {
    const response = await axios.post(
      `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      { sql },
      {
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          apikey: SERVICE_ROLE_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    return { error: error.response?.data || error.message };
  }
}

async function runDiagnose() {
  const sql = fs.readFileSync('sql/diagnose_properties.sql', 'utf-8');
  const result = await executeSQL(sql);
  console.log('📊 Resultado do Diagnóstico:', JSON.stringify(result, null, 2));
}

runDiagnose();
