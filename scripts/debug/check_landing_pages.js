
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
    const slug = 'imobiliaria-fazendas-brasil';
    console.log(`Checking Landing Pages for Organization Slug: ${slug}`);

    // 1. Get Org ID
    const { data: org } = await supabase.from('organizations').select('id, name').eq('slug', slug).single();
    
    if (!org) {
        console.error("Organization not found!");
        return;
    }
    console.log(`Org Found: ${org.name} (${org.id})`);

    // 2. Get Landing Pages
    const { data: pages, error } = await supabase
        .from('landing_pages')
        .select('id, title, status, slug')
        .eq('organization_id', org.id);

    if (error) console.error(error);
    
    console.log("Pages Found:", JSON.stringify(pages, null, 2));

    // 2b. Check Public Policy (Simulate Anon)
    const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
    const { data: publicPages, error: publicError } = await supabaseAnon
        .from('landing_pages')
        .select('id, status')
        .eq('organization_id', org.id)
        .eq('status', 'published');

    console.log("Anon Access - Published Pages:", JSON.stringify(publicPages));
    if (publicError) console.log("Anon Error:", publicError);

}

check();
