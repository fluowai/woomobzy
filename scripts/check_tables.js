
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('--- Listing Tables ---');
  // We can't query information_schema directly with supabase-js easily usually, 
  // but we can try to just select * from a few expected tables to see which error.
  
  const tablesToCheck = ['organizations', 'tenants', 'companies', 'profiles', 'properties', 'site_settings'];
  
  for (const table of tablesToCheck) {
      const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (error) {
          console.log(`❌ Table '${table}' check failed: ${error.message}`);
      } else {
          console.log(`✅ Table '${table}' exists.`);
      }
  }
}

listTables();
