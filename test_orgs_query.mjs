import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://epgaftsjmqmpczvzsrcc.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ2FmdHNqbXFtcGN6dnpzcmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQ5NzA0MDAsImV4cCI6MjAyMDU0NjQwMH0.P0mJzJjVfLzB5gDk-9sR1bZqJ-9-9-_9_9_9_9_9_9_9'; // Dummy anon key, but we login with email/password so auth handles it.
// Wait, I need the actual anon key to use createClient properly!
// I'll extract it from the .env file.
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Logging in...');
  const { data: loginData, error: loginError } =
    await supabase.auth.signInWithPassword({
      email: 'fluowai@gmail.com',
      password: 'Argo@15077399brsc',
    });

  if (loginError) {
    console.error('Login error:', loginError.message);
    return;
  }

  console.log('Logged in. Querying organizations...');
  const {
    data: orgsData,
    error: orgsError,
    count,
  } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true });

  if (orgsError) {
    console.error('Organizations query error:', orgsError);
  } else {
    console.log('Organizations query success. Count:', count);
  }

  const { data: plansData, error: plansError } = await supabase
    .from('plans')
    .select('*');

  if (plansError) {
    console.error('Plans query error:', plansError);
  } else {
    console.log('Plans query success. Count:', plansData?.length);
  }
}

run();
