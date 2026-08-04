import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'C:/Users/paulo/OneDrive/Área de Trabalho/IMOBZY/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
  const PAMAS_ID = '836c2313-0c09-4f07-be1a-501ba188e02d';
  
  // Check for duplicate external_ids
  const { data: all } = await supabase
    .from('properties')
    .select('id, title, external_id, images, property_type, price')
    .eq('organization_id', PAMAS_ID)
    .order('external_id');
  
  const byExternal = new Map();
  all?.forEach(p => {
    const key = p.external_id || '(sem external_id)';
    if (!byExternal.has(key)) byExternal.set(key, []);
    byExternal.get(key).push(p);
  });
  
  const duplicates = [...byExternal.entries()].filter(([k, v]) => v.length > 1);
  console.log(`Total properties: ${all?.length}`);
  console.log(`Unique external_ids: ${byExternal.size}`);
  console.log(`Duplicate external_ids: ${duplicates.length}`);
  
  duplicates.forEach(([ext, props]) => {
    console.log(`\nDUPLICATE: ${ext?.substring(0, 80)}`);
    props.forEach(p => {
      console.log(`  [${p.id.slice(0,8)}] ${p.title?.substring(0,50)} | ${p.property_type} | R$ ${p.price} | ${p.images?.length || 0} imgs`);
    });
  });
  
  // Check properties without external_id
  const withoutExt = all?.filter(p => !p.external_id);
  console.log(`\nSem external_id: ${withoutExt?.length || 0}`);
  withoutExt?.forEach(p => {
    console.log(`  [${p.id.slice(0,8)}] ${p.title?.substring(0,50)}`);
  });
}

diagnose().catch(console.error);
