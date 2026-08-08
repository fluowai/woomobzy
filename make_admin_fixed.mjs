import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para make_admin_fixed.mjs'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function run() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || 'fluowai@gmail.com';

  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find((u) => u.email === email);

  if (!user) {
    console.log('User not found in auth');
    return;
  }

  // Insert into User
  const { error: insErr } = await supabase.from('User').upsert({
    id: user.id,
    email: email,
    name: 'Fluowai Admin',
    role: 'SUPER_ADMIN',
    password: 'placeholder_hash',
    status: 'ACTIVE',
  });

  if (insErr) {
    console.error('Error inserting User:', insErr);
  } else {
    console.log('Successfully inserted into User table as SUPER_ADMIN');
  }

  // Let's also check if we need to insert into `profiles`?
  // Maybe profiles doesn't have `full_name`.
}

run();
