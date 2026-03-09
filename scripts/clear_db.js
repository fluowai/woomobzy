
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Erro: Credenciais Supabase ausentes.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearDatabase() {
  console.log('⚠️  INICIANDO LIMPEZA TOTAL DA TABELA PROPERTIES...');
  
  // Supabase DELETE requires a WHERE clause. 
  // eq('id', 'x') is specific. 
  // neq('id', '0') matches everything usually if IDs are UUIDs or non-zero.
  // Or better: list all IDs and delete them (slower but safer RLS bypass if needed).
  
  // Try truncate first via RPC if available? No, usually not.
  // Let's use delete with a broad condition.
  
  // Delete dependent records first to avoid FK violations
  const { error: errLeads } = await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errLeads) console.log('⚠️ Aviso ao limpar leads:', errLeads.message);
  
  // Try favorites if it exists
  const { error: errFavs } = await supabase.from('favorites').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errFavs) console.log('⚠️ Aviso ao limpar favorites (pode não existir):', errFavs.message);

  const { error } = await supabase
    .from('properties')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything where ID is not empty UUID (basically all)

  if (error) {
    console.error('❌ Erro ao limpar banco:', error);
  } else {
    console.log('✅ Banco de dados limpo com sucesso! Todos os imóveis foram removidos.');
  }
}

clearDatabase();
