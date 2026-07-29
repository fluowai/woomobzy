import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
const bootstrapAdminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para create_admin_user.mjs'
  );
}

if (!bootstrapAdminEmail || !bootstrapAdminPassword) {
  throw new Error(
    'BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_PASSWORD são obrigatórios para create_admin_user.mjs'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createUser() {
  console.log('Creating user...');
  const { data, error } = await supabase.auth.admin.createUser({
    email: bootstrapAdminEmail,
    password: bootstrapAdminPassword,
    email_confirm: true,
  });

  if (error) {
    console.error('Error creating user:', error.message);
  } else {
    console.log('User created successfully:', data.user.id);

    // Check if we need to insert into public.users or if triggers handle it
    const { data: profileCheck } = await supabase
      .from('User')
      .select('*')
      .eq('id', data.user.id)
      .single();
    if (!profileCheck) {
      console.log('Insert into User table manually or let trigger handle it');
    }
  }
}

createUser();
