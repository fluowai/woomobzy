import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://epgaftsjmqmpczvzsrcc.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ2FmdHNqbXFtcGN6dnpzcmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDk2NTI0NSwiZXhwIjoyMTAwNTQxMjQ1fQ.tx6ap1RQ-gPCWn_vQQ7Up-YVknjwnx2F27HWAAUqtwo';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const email = 'fluowai@gmail.com';

  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find((u) => u.email === email);

  const { error: insErr } = await supabase.from('profiles').upsert({
    id: user.id,
    email: email,
    name: 'Fluowai Admin',
    role: 'superadmin',
  });

  if (insErr) {
    console.error('Error inserting profiles superadmin:', insErr.message);
  } else {
    console.log('Successfully inserted into profiles table as superadmin');
  }
}

run();
