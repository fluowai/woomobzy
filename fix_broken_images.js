/**
 * Script para corrigir URLs de imagens quebradas
 * Substitui URLs 404 por placeholders
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 Corrigindo URLs de Imagens Quebradas\n');
console.log('─'.repeat(60));

// Placeholder baseado no tipo de propriedade
const placeholders = {
  'Fazenda': 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80', // Fazenda
  'Casa': 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80', // Casa moderna
  'Apartamento': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80', // Apartamento
  'Terreno': 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80', // Terreno
  'Comercial': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80', // Comercial
  'default': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80' // Imóvel genérico
};

async function fixBrokenImages() {
  try {
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, title, images, type');

    if (error) {
      console.error('❌ Erro ao buscar propriedades:', error.message);
      return;
    }

    console.log(`\n📊 Analisando ${properties.length} propriedades...\n`);

    let fixed = 0;
    let skipped = 0;

    for (const prop of properties) {
      const images = prop.images || [];
      
      // Verificar se tem imagens quebradas (fazendasbrasil.com.br)
      const hasBrokenImages = images.some(img => 
        img.includes('fazendasbrasil.com.br') || 
        img.includes('404') ||
        img.includes('logo-topo')
      );

      if (!hasBrokenImages) {
        skipped++;
        continue;
      }

      // Substituir por placeholder apropriado
      const placeholder = placeholders[prop.type] || placeholders.default;
      const newImages = [placeholder];

      console.log(`🔧 Corrigindo: ${prop.title.substring(0, 50)}...`);
      console.log(`   Tipo: ${prop.type}`);
      console.log(`   Imagens antigas: ${images.length}`);
      console.log(`   Nova imagem: ${placeholder.substring(0, 60)}...`);

      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('properties')
        .update({ images: newImages })
        .eq('id', prop.id);

      if (updateError) {
        console.log(`   ❌ Erro ao atualizar: ${updateError.message}`);
      } else {
        console.log(`   ✅ Atualizado com sucesso!`);
        fixed++;
      }

      console.log('');
    }

    console.log('─'.repeat(60));
    console.log('\n📊 Resumo:');
    console.log(`   - Total de propriedades: ${properties.length}`);
    console.log(`   - Corrigidas: ${fixed}`);
    console.log(`   - Não precisaram correção: ${skipped}`);
    console.log('');

    if (fixed > 0) {
      console.log('✅ URLs corrigidas com sucesso!');
      console.log('   As propriedades agora têm imagens placeholder do Unsplash.');
      console.log('   Você pode substituí-las por imagens reais no painel admin.\n');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Perguntar confirmação
const args = process.argv.slice(2);
if (!args.includes('--confirm')) {
  console.log('\n⚠️  Este script irá substituir as URLs quebradas por placeholders.');
  console.log('   Execute novamente com --confirm para prosseguir:');
  console.log('   node fix_broken_images.js --confirm\n');
  process.exit(0);
}

fixBrokenImages();
