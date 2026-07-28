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
