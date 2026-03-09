import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

console.log(`Connecting to ${supabaseUrl}...`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  try {
    console.log('Testing connection...');
    
    // 1. Check Auth Service (usually works even if DB is empty)
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
        console.error('❌ Auth check failed:', authError.message);
    } else {
        console.log('✅ Auth service connected. Session:', authData.session ? 'Active' : 'None');
    }

    // 2. Check Database Service
    const { count, error: dbError } = await supabase.from('properties').select('*', { count: 'exact', head: true });
    
    if (dbError) {
       console.log('⚠️  Database query returned error:', dbError.message);
    } else {
       console.log('✅ Database connected! Row count in properties:', count);
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

verify();
