
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

async function deleteJunk() {
  console.log('🧹 Varrendo imóveis quebrados (Google/Reserva Legal)...');
  
  // 1. Identificar IDs
  const { data: badProps, error: fetchErr } = await supabase
    .from('properties')
    .select('id, title')
    .ilike('title', '%Compensação de Reserva Legal%');

  if (fetchErr) {
    console.error('Erro ao buscar ruins:', fetchErr);
    return;
  }

  if (badProps.length === 0) {
    console.log('✅ Nenhum imóvel suspeito encontrado.');
    return;
  }

  console.log(`🚨 Encontrados ${badProps.length} imóveis problemáticos.`);
  const idsToDelete = badProps.map(p => p.id);
  console.log('IDs:', idsToDelete);

  // 2. Deletar dependências (Leads)
  const { error: leadsErr } = await supabase
    .from('leads')
    .delete()
    .in('property_id', idsToDelete);
  
  if (leadsErr) console.log('⚠️ Erro ao limpar leads:', leadsErr.message);

  // 3. Deletar Imóveis
  const { error: delErr } = await supabase
    .from('properties')
    .delete()
    .in('id', idsToDelete);

  if (delErr) {
    console.error('❌ Erro ao deletar imóveis:', delErr.message);
  } else {
    console.log('✅ Imóveis quebrados removidos com sucesso!');
  }
}

deleteJunk();
