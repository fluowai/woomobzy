
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

async function checkImageAccessibility() {
  console.log('Fetching a recent property...');
  // Get a property that was likely just imported (created recently)
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, title, images')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching property:', error);
    return;
  }

  if (!properties || properties.length === 0) {
    console.log('No properties found.');
    return;
  }

  const property = properties[0];
  console.log(`Checking property: ${property.title} (${property.id})`);

  if (!property.images || property.images.length === 0) {
    console.log('Property has no images.');
    return;
  }

  const imageUrl = property.images[0];
  console.log(`Image URL: ${imageUrl}`);

  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    console.log(`HTTP Status: ${response.status}`);
    if (response.ok) {
        console.log('Image is accessible!');
    } else {
        console.log('Image is NOT accessible (403/404). This implies the bucket might not be public.');
    }
  } catch (err) {
    console.error('Error fetching image URL:', err);
  }
}

checkImageAccessibility();
