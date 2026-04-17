
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Searching for slugs with 'fazendas'...");
    
    const { data } = await supabase
        .from('organizations')
        .select('slug')
        .ilike('slug', '%fazendas%');

    console.log("Matches:", JSON.stringify(data, null, 2));
}

check();
