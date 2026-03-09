
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // Use Service Role Key to bypass RLS

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkState() {
  console.log('--- Checking Organizations ---');
  const { data: orgs, error: orgsError } = await supabase.from('organizations').select('*');
  
  if (orgsError) {
    console.error('Error fetching organizations:', orgsError);
  } else {
    console.log(`Found ${orgs.length} organizations:`);
    orgs.forEach(org => {
      console.log(`- [${org.id}] ${org.name} (Plan: ${org.plan_id}, Status: ${org.status})`);
    });
  }

  console.log('\n--- Checking Plans ---');
  const { data: plans, error: plansError } = await supabase.from('plans').select('*');
  if (plansError) {
    // Expected if table is missing, which is fine
    console.log('Could not fetch plans (might not exist):', plansError.message);
  } else {
    console.log(`Found ${plans.length} plans.`);
  }

  console.log('\n--- Checking Service Role Key Access ---');
  // Simple check to ensure we can read profiles without RLS blocking us (admin check)
  const { count, error: countError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  if (countError) console.error('Error counting profiles:', countError);
  else console.log(`Total profiles in DB: ${count}`);
}

checkState();
