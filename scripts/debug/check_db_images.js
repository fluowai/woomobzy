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

async function checkImages() {
    const { data, error } = await supabase
        .from('properties')
        .select('title, images')
        .limit(3);
    
    if (error) {
        console.error('Erro:', error);
        return;
    }
    
    console.log('📸 URLs de imagens no banco:\n');
    data.forEach(prop => {
        console.log(`\n🏠 ${prop.title}`);
        console.log('Imagens:');
        if (prop.images && prop.images.length > 0) {
            prop.images.forEach((img, i) => {
                console.log(`  ${i + 1}. ${img}`);
            });
        } else {
            console.log('  ❌ Sem imagens');
        }
    });
}

checkImages();
