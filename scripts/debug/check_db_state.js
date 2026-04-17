
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Credenciais incompletas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log('🔍 Verificando tabelas no banco de dados...');
  const tables = ['site_settings', 'properties', 'leads', 'profiles'];
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ Tabela "${table}": NÃO EXISTE ou erro (${error.message})`);
    } else {
      console.log(`✅ Tabela "${table}": EXISTE`);
    }
  }

  console.log('\n📦 Verificando buckets...');
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.log(`❌ Erro ao listar buckets: ${bucketError.message}`);
  } else {
    const requiredBuckets = ['agency-assets', 'property-images'];
    for (const b of requiredBuckets) {
      const exists = buckets.find(bucket => bucket.name === b);
      if (exists) {
        console.log(`✅ Bucket "${b}": EXISTE (Público: ${exists.public})`);
      } else {
        console.log(`❌ Bucket "${b}": NÃO EXISTE`);
      }
    }
  }
}

checkDatabase();
