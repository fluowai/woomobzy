import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBrokerPhoto() {
  const { data: existing } = await supabase
    .from('site_texts')
    .select('*')
    .eq('key', 'about.broker_photo')
    .single();

  if (existing) {
    console.log('Exists.');
    return;
  }

  const { data, error } = await supabase
    .from('site_texts')
    .insert([
      {
        key: 'about.broker_photo',
        value: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80',
        category: 'content',
        section: 'about',
        description: 'Foto do corretor',
        default_value: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80'
      }
    ])
    .select();

  if (error) console.error('Error:', error);
  else console.log('Inserted:', data);
}

fixBrokerPhoto();
