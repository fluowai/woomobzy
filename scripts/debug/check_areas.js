import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAreas() {
    const { data, error } = await supabase
        .from('properties')
        .select('title, features')
        .limit(5);
    
    if (error) {
        console.error('Erro:', error);
        return;
    }
    
    console.log('📊 Áreas no banco:\n');
    data.forEach((prop, i) => {
        console.log(`${i + 1}. ${prop.title}`);
        console.log(`   Área: ${prop.features?.area || 0} m²\n`);
    });
}

checkAreas();
