import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://epgaftsjmqmpczvzsrcc.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ2FmdHNqbXFtcGN6dnpzcmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NjUyNDUsImV4cCI6MjEwMDU0MTI0NX0.3p4x2i_BtGwzp4ElNV-HqeeVlQcQS53SWai5nJ2NTL0';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log('Logging in...');
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: 'fluowai@gmail.com',
      password: 'Argo@15077399brsc',
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
