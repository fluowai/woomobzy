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
    .select('id, title, images, external_id, property_type, niche, status')
    .eq('organization_id', '836c2313-0c09-4f07-be1a-501ba188e02d')
    .limit(20);

  console.log('Sample PAMAS properties:');
  data?.forEach((p, i) => {
    console.log(`\n${i + 1}. [${p.id.slice(0, 8)}]`);
    console.log(`   title: ${p.title?.substring(0, 60)}`);
    console.log(
      `   type: ${p.property_type} | niche: ${p.niche} | status: ${p.status}`
    );
    console.log(`   images: ${p.images?.length || 0}`);
    if (p.images?.length > 0) {
      console.log(`   first: ${p.images[0]?.substring(0, 80)}`);
    }
  });
}

check().catch(console.error);
