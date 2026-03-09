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

async function checkDescriptions() {
    const { data, error } = await supabase
        .from('properties')
        .select('title, description')
        .limit(3);
    
    if (error) {
        console.error('Erro:', error);
        return;
    }
    
    console.log('📝 Descrições no banco:\n');
    data.forEach((prop, i) => {
        console.log(`${i + 1}. ${prop.title}`);
        console.log(`Descrição: ${prop.description.substring(0, 200)}...\n`);
        
        // Testar regex
        const areaMatch = prop.description.match(/([\d.,]+)\s?(hectares|ha|alqueires|alq|m²|m2)/i);
        if (areaMatch) {
            console.log(`   ✅ Match encontrado: ${areaMatch[1]} ${areaMatch[2]}\n`);
        } else {
            console.log(`   ❌ Nenhum match\n`);
        }
    });
}

checkDescriptions();
