import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing ENV vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUser(email) {
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*, organization:organizations(*)')
    .eq('email', email);

  if (pError) {
    console.error('Error:', pError);
    return;
  }

  console.log('--- PROFILE DATA ---');
  console.log(JSON.stringify(profiles, null, 2));

  const { data: auth, error: aError } = await supabase.auth.admin.listUsers();
  const user = auth?.users?.find(u => u.email === email);
  
  console.log('--- AUTH DATA ---');
  console.log(JSON.stringify(user, null, 2));
}

const target = process.argv[2] || 'contato@okaimoveis.com.br';
debugUser(target);
