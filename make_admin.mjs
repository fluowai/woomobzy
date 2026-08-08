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
    'VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para make_admin.mjs'
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

  // 1. Get the user from auth
  const { data: users, error: listError } =
    await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const user = users.users.find((u) => u.email === email);
  if (!user) {
    console.log('User not found in auth');
    return;
  }

  console.log('User ID:', user.id);

  // 2. Check if we have profiles table
  const { data: profileObj, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  if (!profileErr) {
    console.log('Has profiles table');
    // Try to insert
    const { error: insErr } = await supabase.from('profiles').upsert({
      id: user.id,
      email: email,
      full_name: 'Fluowai Admin',
      role: 'super_admin',
    });
    if (insErr) console.error('Error inserting profile:', insErr);
    else console.log('Inserted into profiles as super_admin');
  }

  // 3. Check if we have User table
  const { data: userObj, error: userErr } = await supabase
    .from('User')
    .select('*')
    .limit(1);
  if (!userErr) {
    console.log('Has User table');
    // Try to insert
    const { error: insErr } = await supabase.from('User').upsert({
      id: user.id,
      email: email,
      name: 'Fluowai Admin',
      role: 'super_admin', // or maybe MEGA_ADMIN? We'll see if it throws
    });
    if (insErr) console.error('Error inserting User:', insErr);
    else console.log('Inserted into User as super_admin');
  }

  // 4. Try saas_settings or similar for super admin flag if needed?
}

run();
