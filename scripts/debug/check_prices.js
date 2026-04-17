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

async function checkPrices() {
    const { data, error } = await supabase
        .from('properties')
        .select('title, price, description')
        .order('price', { ascending: true })
        .limit(5);
    
    if (error) {
        console.error('Erro:', error);
        return;
    }
    
    console.log('💰 Preços no banco (ordenados):\n');
    data.forEach((prop, i) => {
        console.log(`${i + 1}. ${prop.title}`);
        console.log(`   Preço: R$ ${prop.price.toLocaleString('pt-BR')}`);
        
        // Testar regex no título e descrição
        const priceMatch = (prop.title + ' ' + prop.description).match(/R\$\s?([\d.,]+)/);
        if (priceMatch) {
            console.log(`   ✅ Preço encontrado no texto: R$ ${priceMatch[1]}\n`);
        } else {
            console.log(`   ❌ Nenhum preço no texto\n`);
        }
    });
}

checkPrices();
