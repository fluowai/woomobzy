
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use SERVICE ROLE to see the truth
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Fetching organizations...");
    const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug');

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${data.length} organizations.`);
    data.forEach(org => {
        console.log(`\nID: ${org.id}`);
        console.log(`Name: ${org.name}`);
        console.log(`Slug: '${org.slug}'`); // Single quotes to see whitespace
        if (org.slug) {
            console.log(`Slug Chars: ${org.slug.split('').map(c => c.charCodeAt(0)).join(',')}`);
        }
    });
}

check();
