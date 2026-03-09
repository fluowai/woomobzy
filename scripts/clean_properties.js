import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Credenciais do Supabase não encontradas!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clean() {
    console.log('🗑️ Apagando todos os imóveis...');
    const { error } = await supabase.from('properties').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using neq id 0 which is UUID safe trick if column is uuid, or use gte id 0 if int. Properties usually has text/uuid id. Let's assume we can just delete all without filter or use valid filter)
    
    // Safer delete all for Supabase if RLS allows or Service Key is used
    // Since we use Service Key, we can delete all rows.
    // However, Supabase-js might require a WHERE clause.
    // Let's use .neq('title', '______impossible_string______') which matches all real rows
    
    // Better: List IDs and delete them? Or just use .gt('created_at', '1970-01-01')
    
    const { error: delError, count } = await supabase.from('properties').delete().gte('price', 0); // Delete all with price >= 0

    if (delError) {
        console.error('❌ Erro ao limpar:', delError.message);
        
        // Fallback strategy if needed
        console.log('Tentando estratégia alternativa (deletar por titulo != vazio)');
        await supabase.from('properties').delete().neq('title', '');
    } else {
        console.log(`✅ Limpeza concluída.`);
    }
}

clean();
