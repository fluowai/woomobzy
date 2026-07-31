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
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios para test_user_query.mjs'
  );
}

if (!testPassword) {
  throw new Error(
    'BOOTSTRAP_ADMIN_PASSWORD é obrigatória para test_user_query.mjs'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log('Logging in...');
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

  if (authError) {
    console.error('Login failed:', authError);
    return;
  }

  console.log('Logged in. Querying profiles...');
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,name,role,avatar_url,organization_id,created_at')
    .eq('id', authData.user.id);

  if (error) {
    console.error('Query error:', error);
  } else {
    console.log('Query success:', data);
  }
}

run();
