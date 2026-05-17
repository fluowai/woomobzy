/**
 * Script para criar os buckets de storage no Supabase
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('📦 Criando Buckets de Storage...\n');

async function createBuckets() {
  const buckets = [
    { name: 'imobzyimg', public: true },
    { name: 'imobzymsg', public: true },
    { name: 'whatsapp-media', public: true }
  ];

  for (const bucket of buckets) {
    console.log(`📦 Criando bucket "${bucket.name}"...`);
    
    const { data, error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`  ⚠️  Bucket "${bucket.name}" já existe`);
      } else {
        console.error(`  ❌ Erro ao criar bucket "${bucket.name}":`, error.message);
      }
    } else {
      console.log(`  ✅ Bucket "${bucket.name}" criado com sucesso!`);
    }
  }

  console.log('\n✅ Processo concluído!');
}

createBuckets();
