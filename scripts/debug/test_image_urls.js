/**
 * Testar acessibilidade das URLs de imagens
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fetch from 'node-fetch';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Testando Acessibilidade das Imagens\n');
console.log('─'.repeat(60));

async function testImageUrl(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    return {
      url,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      size: response.headers.get('content-length')
    };
  } catch (error) {
    return {
      url,
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

async function checkImageAccessibility() {
  try {
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, title, images')
      .limit(5);

    if (error) {
      console.error('❌ Erro:', error.message);
      return;
    }

    console.log(`\n📸 Testando imagens de ${properties.length} propriedades...\n`);

    let totalTested = 0;
    let accessible = 0;
    let broken = 0;

    for (const prop of properties) {
      console.log(`🏠 ${prop.title.substring(0, 50)}...`);
      
      const images = prop.images || [];
      
      if (images.length === 0) {
        console.log('   ⚠️  Sem imagens\n');
        continue;
      }

      for (let i = 0; i < Math.min(images.length, 2); i++) {
        const imageUrl = images[i];
        totalTested++;
        
        console.log(`   Testando imagem ${i + 1}...`);
        const result = await testImageUrl(imageUrl);
        
        if (result.ok) {
          accessible++;
          console.log(`   ✅ Acessível (${result.status})`);
          console.log(`      Tipo: ${result.contentType}`);
          if (result.size) {
            console.log(`      Tamanho: ${(result.size / 1024).toFixed(2)} KB`);
          }
        } else {
          broken++;
          console.log(`   ❌ Inacessível (${result.status})`);
          if (result.error) {
            console.log(`      Erro: ${result.error}`);
          }
        }
        
        console.log(`      URL: ${imageUrl.substring(0, 70)}...`);
      }
      
      console.log('');
    }

    console.log('─'.repeat(60));
    console.log('\n📊 Resultado dos Testes:');
    console.log(`   - Total testado: ${totalTested}`);
    console.log(`   - Acessíveis: ${accessible} (${((accessible/totalTested)*100).toFixed(1)}%)`);
    console.log(`   - Quebradas: ${broken} (${((broken/totalTested)*100).toFixed(1)}%)`);
    console.log('');

    if (broken > 0) {
      console.log('⚠️  PROBLEMA IDENTIFICADO:');
      console.log('   Algumas imagens externas não estão acessíveis.');
      console.log('   Isso explica por que as fotos não aparecem no site.\n');
      console.log('💡 SOLUÇÕES:');
      console.log('   1. Verificar se as URLs estão corretas');
      console.log('   2. Fazer download e re-upload das imagens para o Supabase');
      console.log('   3. Atualizar as URLs das propriedades\n');
    } else {
      console.log('✅ Todas as imagens testadas estão acessíveis!');
      console.log('   O problema pode ser CORS ou configuração do frontend.\n');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkImageAccessibility();
