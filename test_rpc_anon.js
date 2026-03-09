
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Use ANON KEY to simulate frontend
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const slug = 'fazendas-brasil';
    console.log(`Testing RPC get_tenant_public for slug: ${slug} with ANON key...`);

    const { data, error } = await supabase
        .rpc('get_tenant_public', { slug_input: slug });

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("RPC Success. Data:", JSON.stringify(data, null, 2));
        if (Array.isArray(data) && data.length === 0) {
            console.log("⚠️ RPC returned empty array. Slug not found or RLS issue?");
        } else if (!data) {
             console.log("⚠️ RPC returned null/undefined.");
        }
    }
}

check();
