
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking FIRST page (created_at ASC)...");
    const slug = 'imobiliaria-fazendas-brasil';
    const { data: org } = await supabase.from('organizations').select('id').eq('slug', slug).single();

    const { data: page } = await supabase
        .from('landing_pages')
        .select('title, slug, created_at')
        .eq('organization_id', org.id)
        .eq('status', 'published')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

    console.log("Current 'Home' Page Candidate:", JSON.stringify(page, null, 2));
}

check();
