import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PAMAS_ID = '836c2313-0c09-4f07-be1a-501ba188e02d';
const MEGA_ID = '52757ffb-dd3a-4106-8783-31ebe01a1455';

async function run() {
  console.log('=== PAMAS PROPERTIES COM IMAGENS (sample) ===\n');
  const { data: pamasWithImages } = await supabase
    .from('properties')
    .select('id, title, images')
    .eq('organization_id', PAMAS_ID)
    .not('images', 'is', null)
    .limit(5);
    
  pamasWithImages?.forEach(prop => {
    console.log(`Title: ${prop.title.substring(0, 60)}`);
    console.log(`Images (${prop.images?.length || 0}):`);
    (prop.images || []).slice(0, 2).forEach(img => {
      console.log(`  ${img}`);
    });
    console.log('');
  });
  
  console.log('=== PAMAS PROPERTIES SEM IMAGENS (sample) ===\n');
  const { data: pamasWithoutImages } = await supabase
    .from('properties')
    .select('id, title, images')
    .eq('organization_id', PAMAS_ID)
    .or('images.is.null,eq.images.{ }')
    .limit(5);
    
  pamasWithoutImages?.forEach(prop => {
    console.log(`Title: ${prop.title.substring(0, 60)}`);
    console.log(`Images: ${prop.images}`);
    console.log('');
  });
  
  console.log('=== MEGA PROPERTIES (all) ===\n');
  const { data: megaProps } = await supabase
    .from('properties')
    .select('id, title, images, external_id')
    .eq('organization_id', MEGA_ID);
    
  megaProps?.forEach(prop => {
    console.log(`Title: ${prop.title.substring(0, 60)}`);
    console.log(`Images: ${prop.images?.length || 0}`);
    console.log(`External: ${prop.external_id?.substring(0, 80)}`);
    console.log('');
  });
}

run().catch(console.error);
