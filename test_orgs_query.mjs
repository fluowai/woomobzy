import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const testEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || 'fluowai@gmail.com';
const testPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios para test_orgs_query.mjs'
  );
}

if (!testPassword) {
  throw new Error(
    'BOOTSTRAP_ADMIN_PASSWORD é obrigatória para test_orgs_query.mjs'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Logging in...');
  const { data: loginData, error: loginError } =
    await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

  if (loginError) {
    console.error('Login error:', loginError.message);
    return;
  }

  console.log('Logged in. Querying organizations...');
  const {
    data: orgsData,
    error: orgsError,
    count,
  } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true });

  if (orgsError) {
    console.error('Organizations query error:', orgsError);
  } else {
    console.log('Organizations query success. Count:', count);
  }

  const { data: plansData, error: plansError } = await supabase
    .from('plans')
    .select('*');

  if (plansError) {
    console.error('Plans query error:', plansError);
  } else {
    console.log('Plans query success. Count:', plansData?.length);
  }
}

run();
