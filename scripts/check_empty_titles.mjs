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
    .select('id, title, external_id')
    .eq('organization_id', '836c2313-0c09-4f07-be1a-501ba188e02d')
    .or('title.eq.,title.is.null');

  console.log('Empty/null titles:', data?.length || 0);
  data?.forEach((p) => {
    console.log(
      `  [${p.id.slice(0, 8)}] title: "${p.title}" | external: ${p.external_id?.substring(0, 60)}`
    );
  });
}

check().catch(console.error);
