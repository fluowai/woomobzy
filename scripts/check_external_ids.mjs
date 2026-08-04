import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config({ path: 'C:/Users/paulo/OneDrive/Área de Trabalho/IMOBZY/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkExternalIds() {
  const { data } = await supabase
    .from('properties')
    .select('id, external_id, images')
    .eq('organization_id', '836c2313-0c09-4f07-be1a-501ba188e02d')
    .not('external_id', 'is', null);
  
  console.log(`Checking ${data?.length || 0} external_ids...`);
  
  let ok = 0, fail = 0, redirect = 0;
  const samples = [];
  
  for (const p of data || []) {
    try {
      const res = await fetch(p.external_id, { method: 'HEAD', redirect: 'manual' });
      if (res.status === 200) ok++;
      else if (res.status >= 300 && res.status < 400) redirect++;
      else fail++;
    } catch (e) {
      fail++;
    }
  }
  
  console.log(`OK: ${ok}, Redirect: ${redirect}, Fail: ${fail}`);
}

checkExternalIds().catch(console.error);
