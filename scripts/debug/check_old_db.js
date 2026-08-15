
import { createClient } from '@supabase/supabase-js';

const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL;
const OLD_SUPABASE_KEY = process.env.OLD_SUPABASE_KEY;

if (!OLD_SUPABASE_URL || !OLD_SUPABASE_KEY) {
  throw new Error('Configure OLD_SUPABASE_URL and OLD_SUPABASE_KEY');
}

const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY);

async function checkOldData() {
  console.log('🔍 Verificando banco antigo...');
  const { count, error } = await oldSupabase.from('properties').select('*', { count: 'exact', head: true });
  
  if (error) {
    console.log(`❌ Erro no banco antigo: ${error.message}`);
  } else {
    console.log(`📊 Banco antigo tem ${count} propriedades.`);
  }
}

checkOldData();
