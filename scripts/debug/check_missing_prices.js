import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMissingPrices() {
  const { data, error } = await supabase
    .from('properties')
    .select('id, title, price')
    .or('price.is.null,price.eq.0');

  if (error) {
    console.error('Error fetching properties:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`Found ${data.length} properties with missing or zero price:`);
    data.forEach(p => {
      console.log(`- ${p.id}: ${p.title} (price: ${p.price})`);
    });
  } else {
    console.log('All properties have a valid price.');
  }
}

checkMissingPrices();
