import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl =
  process.env.VITE_SUPABASE_URL || 'https://epgaftsjmqmpczvzsrcc.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ2FmdHNqbXFtcGN6dnpzcmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDk2NTI0NSwiZXhwIjoyMTAwNTQxMjQ1fQ.tx6ap1RQ-gPCWn_vQQ7Up-YVknjwnx2F27HWAAUqtwo';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createUser() {
  console.log('Creating user...');
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'fluowai@gmail.com',
    password: 'Argo@15077399brsc',
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
