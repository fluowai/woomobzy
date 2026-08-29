import pg from 'pg';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const connectionString = 'postgresql://postgres.epgaftsjmqmpczvzsrcc:Ru3fxgGYHMepMYm3@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const supabaseUrl = 'https://epgaftsjmqmpczvzsrcc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ2FmdHNqbXFtcGN6dnpzcmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDk2NTI0NSwiZXhwIjoyMTAwNTQxMjQ1fQ.tx6ap1RQ-gPCWn_vQQ7Up-YVknjwnx2F27HWAAUqtwo';

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const client = await pool.connect();
  try {
    // console.log('Applying SQL Migration...');
    // const sql = fs.readFileSync('migrations/20260829_woo_control_schema.sql', 'utf8');
    // await client.query(sql);
    // console.log('Migration applied successfully.');

    const targetEmail = 'fluowai@gmail.com';
    console.log(`Starting migration for ${targetEmail}...`);

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

    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ role: 'PLATFORM_OWNER' })
      .eq('id', profile.id);

    if (updateProfileError) {
      console.error('Failed to update profile role:', updateProfileError);
      return;
    }
    
    console.log('Successfully updated profile role to PLATFORM_OWNER.');

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
    }

  } catch (err) {
    console.error('Execution failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
