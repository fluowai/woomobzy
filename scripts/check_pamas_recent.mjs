import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'C:/Users/paulo/OneDrive/Área de Trabalho/IMOBZY/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data } = await supabase
    .from('properties')
    .select('id, title, images, created_at, external_id')
    .eq('organization_id', '836c2313-0c09-4f07-be1a-501ba188e02d')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('=== PAMAS properties (recent first) ===');
  data?.forEach((p) => {
    const date = new Date(p.created_at).toLocaleString('pt-BR');
    console.log(`\n[${p.id.slice(0, 8)}] ${date}`);
    console.log(`  title: ${p.title?.substring(0, 60)}`);
    console.log(`  external: ${p.external_id?.substring(0, 80)}`);
    console.log(`  images: ${p.images?.length || 0}`);
    if (p.images?.length) {
      console.log(`  first: ${p.images[0]?.substring(0, 90)}`);
    }
  });
}

check().catch(console.error);
