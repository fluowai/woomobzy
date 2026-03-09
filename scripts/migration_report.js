import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function generateReport() {
  console.log('📊 RELATÓRIO FINAL DA MIGRAÇÃO\n');
  console.log('═'.repeat(60));
  
  const { data, error } = await supabase
    .from('properties')
    .select('id, title, city, state, price, images')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log(`\n✅ Total de imóveis: ${data.length}\n`);
  
  let totalPhotos = 0;
  data.forEach((p, index) => {
    const photoCount = p.images?.length || 0;
    totalPhotos += photoCount;
    console.log(`${index + 1}. ${p.title}`);
    console.log(`   📍 ${p.city || 'N/A'}, ${p.state || 'N/A'}`);
    console.log(`   💰 ${p.price > 0 ? p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Sob Consulta'}`);
    console.log(`   📸 ${photoCount} fotos`);
    console.log('');
  });

  console.log('═'.repeat(60));
  console.log(`\n📈 ESTATÍSTICAS:`);
  console.log(`   Total de imóveis: ${data.length}`);
  console.log(`   Total de fotos: ${totalPhotos}`);
  console.log(`   Média de fotos por imóvel: ${(totalPhotos / data.length).toFixed(1)}`);
  
  const withPhotos = data.filter(p => p.images && p.images.length > 0);
  console.log(`   Imóveis com fotos: ${withPhotos.length} (${((withPhotos.length / data.length) * 100).toFixed(0)}%)`);
}

generateReport();
