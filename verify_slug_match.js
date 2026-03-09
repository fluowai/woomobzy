
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
    console.log("Checking for slug 'fazendas-brasil'...");

    // 1. Exact
    const { data: d1 } = await supabase.from('organizations').select('id, slug').eq('slug', 'fazendas-brasil');
    console.log(`Exact Match: ${d1?.length}`);

    // 2. ILike
    const { data: d2 } = await supabase.from('organizations').select('id, slug').ilike('slug', 'fazendas-brasil');
    console.log(`ILike Match: ${d2?.length}`);

    // 3. List ALL slugs to see what is there
    const { data: all } = await supabase.from('organizations').select('slug');
    console.log("All Slugs:", JSON.stringify(all));
}

check();
