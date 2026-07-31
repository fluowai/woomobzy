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
    'VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para update_mega_admin.mjs'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function updateRole() {
  const { data, error } = await supabase
    .from('User')
    .update({ role: 'MEGA_ADMIN' })
    .eq('email', process.env.BOOTSTRAP_ADMIN_EMAIL || 'fluowai@gmail.com');

  if (error) {
    console.error('Failed to update to MEGA_ADMIN:', error);
  } else {
    console.log('Successfully updated to MEGA_ADMIN!');
  }
}

updateRole();
