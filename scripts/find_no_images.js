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

async function findPropertiesWithoutImages() {
  console.log('🔍 Buscando imóveis sem fotos...\n');
  
  const { data, error } = await supabase
    .from('properties')
    .select('id, title, images')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro:', error);
    return;
  }

  const noImages = data.filter(p => !p.images || p.images.length === 0);
  const withImages = data.filter(p => p.images && p.images.length > 0);

  console.log(`📊 ESTATÍSTICAS:`);
  console.log(`   Total de imóveis: ${data.length}`);
  console.log(`   Com fotos: ${withImages.length}`);
  console.log(`   Sem fotos: ${noImages.length}`);
  console.log(`   Percentual sem fotos: ${((noImages.length / data.length) * 100).toFixed(1)}%\n`);

  if (noImages.length > 0) {
    console.log(`🚨 IMÓVEIS SEM FOTOS (${noImages.length}):`);
    noImages.forEach(p => {
      console.log(`   - [${p.id.substring(0, 8)}...] ${p.title}`);
    });
  }
}

findPropertiesWithoutImages();
