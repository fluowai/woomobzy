import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://epgaftsjmqmpczvzsrcc.supabase.co';
// Service role key allows bypassing RLS for administrative tasks
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ2FmdHNqbXFtcGN6dnpzcmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDk2NTI0NSwiZXhwIjoyMTAwNTQxMjQ1fQ.tx6ap1RQ-gPCWn_vQQ7Up-YVknjwnx2F27HWAAUqtwo';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function migratePlatformOwner() {
  const targetEmail = 'fluowai@gmail.com';

  console.log(`Starting migration for ${targetEmail}...`);

  // 1. Fetch the user's profile
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', targetEmail);

  if (profileError || !profiles || profiles.length === 0) {
    console.error('Failed to find profile or error occurred:', profileError);
    return;
  }

  const profile = profiles[0];
  console.log(`Found profile for ${targetEmail}. ID: ${profile.id}, Org ID: ${profile.organization_id}`);

  // 2. Update the profile role to PLATFORM_OWNER
  const { error: updateProfileError } = await supabase
    .from('profiles')
    .update({ role: 'PLATFORM_OWNER' })
    .eq('id', profile.id);

  if (updateProfileError) {
    console.error('Failed to update profile role:', updateProfileError);
    return;
  }
  
  console.log('Successfully updated profile role to PLATFORM_OWNER.');

  // 3. Update the associated organization type to PLATFORM
  if (profile.organization_id) {
    const { error: updateOrgError } = await supabase
      .from('organizations')
      .update({ type: 'PLATFORM' })
      .eq('id', profile.organization_id);

    if (updateOrgError) {
      console.error('Failed to update organization type:', updateOrgError);
    } else {
      console.log('Successfully updated organization type to PLATFORM.');
    }
  } else {
    console.warn('User has no associated organization. Skipping organization update.');
  }

  console.log('Migration complete!');
}

migratePlatformOwner();
