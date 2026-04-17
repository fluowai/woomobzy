/**
 * Verificar propriedades e suas imagens
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🏠 Verificando Propriedades e Imagens\n');
console.log('─'.repeat(60));

async function checkProperties() {
  try {
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, title, images, price, type, status')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar propriedades:', error.message);
      return;
    }

    console.log(`\n✅ Total de propriedades: ${properties.length}\n`);

    if (properties.length === 0) {
      console.log('📭 Nenhuma propriedade encontrada no banco de dados.');
      console.log('   → Você precisa importar ou criar propriedades primeiro.\n');
      return;
    }

    let withImages = 0;
    let withoutImages = 0;
    let externalImages = 0;
    let supabaseImages = 0;

    properties.forEach((prop, index) => {
      const images = prop.images || [];
      const hasImages = images.length > 0;

      if (hasImages) {
        withImages++;
        
        // Verificar tipo de imagem
        const isExternal = images.some(img => !img.includes('supabase.co'));
        const isSupabase = images.some(img => img.includes('supabase.co'));
        
        if (isExternal) externalImages++;
        if (isSupabase) supabaseImages++;
      } else {
        withoutImages++;
      }

      if (index < 10) { // Mostrar apenas as primeiras 10
        console.log(`${index + 1}. ${prop.title}`);
        console.log(`   Status: ${prop.status} | Tipo: ${prop.type} | Preço: R$ ${prop.price?.toLocaleString('pt-BR') || 'N/A'}`);
        console.log(`   Imagens: ${images.length}`);
        
        if (images.length > 0) {
          images.slice(0, 2).forEach((img, i) => {
            const imgType = img.includes('supabase.co') ? '🟢 Supabase' : '🔵 Externa';
            const shortUrl = img.length > 60 ? img.substring(0, 60) + '...' : img;
            console.log(`     ${i + 1}. ${imgType}: ${shortUrl}`);
          });
          if (images.length > 2) {
            console.log(`     ... e mais ${images.length - 2} imagem(ns)`);
          }
        } else {
          console.log(`     ⚠️  SEM IMAGENS`);
        }
        console.log('');
      }
    });

    if (properties.length > 10) {
      console.log(`... e mais ${properties.length - 10} propriedades\n`);
    }

    console.log('─'.repeat(60));
    console.log('\n📊 Estatísticas:');
    console.log(`   - Com imagens: ${withImages}`);
    console.log(`   - Sem imagens: ${withoutImages}`);
    console.log(`   - Com imagens externas: ${externalImages}`);
    console.log(`   - Com imagens no Supabase: ${supabaseImages}`);
    console.log('');

    if (supabaseImages === 0 && withImages > 0) {
      console.log('⚠️  ATENÇÃO: Todas as imagens são externas!');
      console.log('   As imagens estão hospedadas em outros sites.');
      console.log('   Isso pode causar problemas se os links quebrarem.\n');
    }

    if (withoutImages > 0) {
      console.log(`⚠️  ${withoutImages} propriedade(s) sem imagens.`);
      console.log('   Adicione imagens através do painel admin.\n');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkProperties();
