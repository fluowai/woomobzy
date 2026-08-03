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

async function run() {
  console.log('=== ANALISANDO DUPLICATAS PAMAS ===\n');
  
  const { data: props } = await supabase
    .from('properties')
    .select('id, title, price, status, images')
    .eq('organization_id', PAMAS_ID);
    
  // Group by title
  const byTitle = new Map();
  props?.forEach(p => {
    const key = p.title.toLowerCase().trim();
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(p);
  });
  
  const duplicates = Array.from(byTitle.entries()).filter(([_, items]) => items.length > 1);
  
  console.log(`Total properties: ${props?.length}`);
  console.log(`Unique titles: ${byTitle.size}`);
  console.log(`Duplicate title groups: ${duplicates.length}\n`);
  
  if (duplicates.length > 0) {
    console.log('Sample duplicates:');
    duplicates.slice(0, 10).forEach(([title, items]) => {
      console.log(`\n"${title.substring(0, 60)}" (${items.length} copies):`);
      items.forEach(item => {
        console.log(`  ID: ${item.id} | Price: ${item.price} | Status: ${item.status} | Images: ${item.images?.length || 0}`);
      });
    });
  }
  
  // Check for properties with same title and price
  const byTitlePrice = new Map();
  props?.forEach(p => {
    const key = `${p.title.toLowerCase().trim()}|${p.price}`;
    if (!byTitlePrice.has(key)) byTitlePrice.set(key, []);
    byTitlePrice.get(key).push(p);
  });
  
  const exactDuplicates = Array.from(byTitlePrice.entries()).filter(([_, items]) => items.length > 1);
  console.log(`\nExact duplicates (same title + price): ${exactDuplicates.length}`);
}

run().catch(console.error);
