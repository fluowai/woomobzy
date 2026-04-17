import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const email = 'pauloargolo87@gmail.com';
  console.log(`Checking profile for ${email}...`);
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
  } else {
    console.log("Profile Data:", profile);
  }
}

run();
