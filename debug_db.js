import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Fetching trigger info...");
  const { data, error } = await supabase.rpc('query_trigger_debug');
  if (error) {
    console.log("Trying raw query since RPC might not exist...");
    // Just fetch the first profile to see if it works
    const { data: p, error: pe } = await supabase.from('profiles').select('*').limit(1);
    console.log("Profiles check:", { p, pe });
  } else {
    console.log(data);
  }
}

run();
