
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const slug = 'essencia-do-campo';
    console.log(`Checking content of: ${slug}`);

    const { data: page } = await supabase
        .from('landing_pages')
        .select('blocks')
        .eq('slug', slug)
        .single();
    
    if (!page) return console.log("Page not found");

    const content = JSON.stringify(page.blocks);
    const hasText = content.toLowerCase().includes('terra produtiva');
    
    console.log(`Contains 'Terra Produtiva': ${hasText}`);
    if (hasText) {
        // Show snippet
        const idx = content.toLowerCase().indexOf('terra produtiva');
        console.log("Snippet:", content.substring(idx - 50, idx + 50));
    }
}

check();
