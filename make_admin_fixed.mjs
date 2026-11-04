import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://epgaftsjmqmpczvzsrcc.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ2FmdHNqbXFtcGN6dnpzcmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDk2NTI0NSwiZXhwIjoyMTAwNTQxMjQ1fQ.tx6ap1RQ-gPCWn_vQQ7Up-YVknjwnx2F27HWAAUqtwo';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function run() {
  const email = 'fluowai@gmail.com';

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
