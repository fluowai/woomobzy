
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDB() {
  console.log('Checking database...');
  const { data, error } = await supabase
    .from('properties')
    .select('id, title, city, state, images')
    .limit(10);

  if (error) {
    console.error('Error fetching properties:', error);
    return;
  }

  console.log('Found properties:', data.length);
  
  // Check for duplicates
  const titles = {};
  let duplicates = 0;
  
  data.forEach(p => {
    console.log(`- [${p.id}] ${p.title} (${p.city}/${p.state}) - Images: ${p.images ? p.images.length : 0} - First: ${p.images?.[0]}`);
  });
  
  if (duplicates > 0) {
      console.log(`\n🚨 FOUND ${duplicates} DUPLICATES IN THIS BATCH!`);
  } else {
      console.log(`\n✅ No duplicates found in this batch.`);
  }
}

checkDB();
