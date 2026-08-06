import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config({ path: 'C:/Users/paulo/OneDrive/Área de Trabalho/IMOBZY/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndDeleteInvalid() {
  const PAMAS_ID = '836c2313-0c09-4f07-be1a-501ba188e02d';

  // Get all PAMAS properties with external_id
  const { data: properties } = await supabase
    .from('properties')
    .select('id, title, external_id')
    .eq('organization_id', PAMAS_ID)
    .not('external_id', 'is', null);

  console.log(`Checking ${properties?.length || 0} external_ids...`);

  let invalid = [];
  for (const prop of properties || []) {
    try {
      const res = await fetch(prop.external_id, {
        method: 'HEAD',
        redirect: 'follow',
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (res.status >= 400) {
        invalid.push({ ...prop, status: res.status });
      }
    } catch (e) {
      invalid.push({ ...prop, status: 'ERROR', error: e.message });
    }
  }

  console.log(`\nInvalid external_ids: ${invalid.length}`);
  invalid.forEach((p) => {
    console.log(
      `  [${p.id.slice(0, 8)}] ${p.status} - ${p.title?.substring(0, 50)}`
    );
    console.log(`    ${p.external_id}`);
  });

  if (invalid.length > 0) {
    console.log(`\nDeleting ${invalid.length} invalid properties...`);
    for (const prop of invalid) {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', prop.id);

      if (error) {
        console.error(`Failed to delete ${prop.id}:`, error.message);
      } else {
        console.log(`Deleted ${prop.id}`);
      }
    }
  }

  // Final count
  const { data: remaining } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', PAMAS_ID);

  console.log(`\nRemaining properties: ${remaining?.length || 0}`);
}

checkAndDeleteInvalid().catch(console.error);
