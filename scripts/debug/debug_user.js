
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkUser() {
  const userId = 'ac7166c6-daad-408e-b9db-74c4f2d507fa';
  console.log('🔍 Checking user:', userId);
  
  const { data: profile, error: pError } = await supabase
    .from('profiles')
    .select('*, organization:organizations(*)')
    .eq('id', userId)
    .single();
    
  if (pError) {
    console.error('❌ Profile Error:', pError);
  } else {
    console.log('✅ Profile:', JSON.stringify(profile, null, 2));
  }
}

checkUser();
