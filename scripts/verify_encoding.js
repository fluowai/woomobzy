import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('🔎 Verificando encoding...');
    
    // Search for the problematic property
    const { data, error } = await supabase
        .from('properties')
        .select('title, city, state')
        .ilike('title', '%Merizzo%');

    if (error) {
        console.error('❌ Erro:', error.message);
    } else {
        if (data.length > 0) {
            console.log('✅ Encontrado:', data[0]);
            console.log('   Cidade:', data[0].city);
        } else {
             console.log('⚠️ Imóvel Merizzo não encontrado (talvez esteja em outra página além das 3 primeiras?)');
             
             // Check any other with special chars
             const { data: anyData } = await supabase.from('properties').select('title, city').ilike('city', '%Cap%').limit(1);
             if(anyData && anyData.length > 0) console.log('   Exemplo com Cap:', anyData[0]);
        }
    }
}

verify();
