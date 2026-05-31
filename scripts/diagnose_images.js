/**
 * ImobiSaaS - Diagnóstico de Imagens
 * 
 * Este script diagnostica problemas com exibição de imagens:
 * - Verifica se os buckets existem
 * - Testa políticas de acesso
 * - Valida URLs das imagens
 * - Lista imagens quebradas
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { isMinioConfigured } from '../server/lib/minio-storage.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  console.error('Certifique-se de que VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

console.log('🔍 ImobiSaaS - Diagnóstico de Imagens\n');
console.log('📍 Supabase URL:', supabaseUrl);
console.log('🔑 Usando Service Role:', !!supabaseAdmin);
console.log('─'.repeat(60));

async function checkBuckets() {
  console.log('\n📦 Verificando Buckets de Storage...\n');
  
  if (isMinioConfigured()) {
    console.log('  MinIO/S3 configurado. Buckets Supabase legados nao serao validados neste diagnostico.');
    return true;
  }

  const requiredBuckets = ['agency-assets', 'property-images'];
  
  try {
    const { data: buckets, error } = await (supabaseAdmin || supabase).storage.listBuckets();
    
    if (error) {
      console.error('❌ Erro ao listar buckets:', error.message);
      return false;
    }
    
    console.log(`✅ Total de buckets encontrados: ${buckets.length}`);
    
    for (const bucketName of requiredBuckets) {
      const bucket = buckets.find(b => b.name === bucketName);
      
      if (bucket) {
        console.log(`  ✅ Bucket "${bucketName}" existe`);
        console.log(`     - Público: ${bucket.public ? 'Sim' : 'Não'}`);
        console.log(`     - ID: ${bucket.id}`);
      } else {
        console.log(`  ❌ Bucket "${bucketName}" NÃO EXISTE`);
        console.log(`     → Crie este bucket no Supabase Dashboard > Storage`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar buckets:', error.message);
    return false;
  }
}

async function checkStoragePolicies() {
  console.log('\n🔒 Verificando Políticas de Storage...\n');
  
  if (isMinioConfigured()) {
    console.log('  MinIO/S3 configurado. Teste de policies Supabase ignorado.');
    return true;
  }

  const testFile = new Blob(['test'], { type: 'text/plain' });
  const testFileName = `test_${Date.now()}.txt`;
  
  // Teste de upload
  console.log('  📤 Testando upload...');
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('property-images')
    .upload(testFileName, testFile);
  
  if (uploadError) {
    console.log('  ❌ Upload falhou:', uploadError.message);
    console.log('     → Verifique as políticas RLS do storage');
    return false;
  } else {
    console.log('  ✅ Upload funcionou!');
  }
  
  // Teste de leitura pública
  console.log('  📥 Testando acesso público...');
  const { data: publicUrlData } = supabase.storage
    .from('property-images')
    .getPublicUrl(testFileName);
  
  console.log('  📍 URL gerada:', publicUrlData.publicUrl);
  
  // Testar se a URL é acessível
  try {
    const response = await fetch(publicUrlData.publicUrl);
    if (response.ok) {
      console.log('  ✅ URL acessível publicamente!');
    } else {
      console.log(`  ❌ URL retornou status ${response.status}`);
      console.log('     → Verifique se o bucket está marcado como público');
    }
  } catch (error) {
    console.log('  ❌ Erro ao acessar URL:', error.message);
  }
  
  // Limpar arquivo de teste
  console.log('  🧹 Limpando arquivo de teste...');
  await supabase.storage.from('property-images').remove([testFileName]);
  console.log('  ✅ Limpeza concluída');
  
  return true;
}

async function checkPropertyImages() {
  console.log('\n🏠 Verificando Imagens das Propriedades...\n');
  
  try {
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, title, images');
    
    if (error) {
      console.error('❌ Erro ao buscar propriedades:', error.message);
      return false;
    }
    
    console.log(`✅ Total de propriedades: ${properties.length}\n`);
    
    let totalImages = 0;
    let brokenImages = 0;
    let propertiesWithoutImages = 0;
    
    for (const property of properties) {
      const images = property.images || [];
      totalImages += images.length;
      
      if (images.length === 0) {
        propertiesWithoutImages++;
        console.log(`  ⚠️  "${property.title}" - SEM IMAGENS`);
      } else {
        console.log(`  📸 "${property.title}" - ${images.length} imagem(ns)`);
        
        // Verificar se as URLs são válidas
        for (let i = 0; i < images.length; i++) {
          const imageUrl = images[i];
          
          if (!imageUrl || imageUrl.includes('placeholder')) {
            console.log(`     ❌ Imagem ${i + 1}: Placeholder ou vazia`);
            brokenImages++;
            continue;
          }
          
          // Verificar se é URL do Supabase
          if (!imageUrl.includes('supabase.co')) {
            console.log(`     ⚠️  Imagem ${i + 1}: URL externa - ${imageUrl.substring(0, 50)}...`);
            continue;
          }
          
          // Verificar se a URL é do banco correto
          if (!imageUrl.includes(supabaseUrl.replace('https://', ''))) {
            console.log(`     ❌ Imagem ${i + 1}: URL do banco ANTIGO!`);
            console.log(`        ${imageUrl.substring(0, 80)}...`);
            brokenImages++;
          } else {
            console.log(`     ✅ Imagem ${i + 1}: OK`);
          }
        }
      }
    }
    
    console.log('\n📊 Resumo:');
    console.log(`  - Total de imagens: ${totalImages}`);
    console.log(`  - Propriedades sem imagens: ${propertiesWithoutImages}`);
    console.log(`  - Imagens quebradas/antigas: ${brokenImages}`);
    
    if (brokenImages > 0) {
      console.log('\n⚠️  ATENÇÃO: Existem imagens com URLs do banco antigo!');
      console.log('   → Execute o script de migração para transferir as imagens');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar imagens:', error.message);
    return false;
  }
}

async function checkDatabaseConnection() {
  console.log('\n🔌 Testando Conexão com Banco de Dados...\n');
  
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro na conexão:', error.message);
      return false;
    }
    
    console.log('✅ Conexão estabelecida com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    return false;
  }
}

async function listStorageFiles() {
  console.log('\n📁 Listando Arquivos no Storage...\n');
  
  if (isMinioConfigured()) {
    console.log('  MinIO/S3 configurado. Use o console MinIO ou o inventario de objetos para listar midias.');
    return;
  }

  const buckets = ['agency-assets', 'property-images'];
  
  for (const bucketName of buckets) {
    console.log(`\n  📦 Bucket: ${bucketName}`);
    
    try {
      const { data: files, error } = await supabase.storage
        .from(bucketName)
        .list();
      
      if (error) {
        console.log(`     ❌ Erro ao listar: ${error.message}`);
        continue;
      }
      
      if (files.length === 0) {
        console.log('     📭 Vazio (sem arquivos)');
      } else {
        console.log(`     ✅ ${files.length} arquivo(s) encontrado(s):`);
        files.slice(0, 5).forEach(file => {
          console.log(`        - ${file.name} (${(file.metadata?.size / 1024).toFixed(2)} KB)`);
        });
        if (files.length > 5) {
          console.log(`        ... e mais ${files.length - 5} arquivo(s)`);
        }
      }
    } catch (error) {
      console.log(`     ❌ Erro: ${error.message}`);
    }
  }
}

// Executar todos os diagnósticos
async function runDiagnostics() {
  try {
    await checkDatabaseConnection();
    await checkBuckets();
    await listStorageFiles();
    await checkStoragePolicies();
    await checkPropertyImages();
    
    console.log('\n' + '─'.repeat(60));
    console.log('✅ Diagnóstico concluído!\n');
  } catch (error) {
    console.error('\n❌ Erro durante diagnóstico:', error);
    process.exit(1);
  }
}

runDiagnostics();
