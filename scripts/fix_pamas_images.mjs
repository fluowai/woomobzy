import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'C:/Users/paulo/OneDrive/Área de Trabalho/IMOBZY/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixImages() {
  const PAMAS_ID = '836c2313-0c09-4f07-be1a-501ba188e02d';

  // Get all PAMAS properties
  const { data: properties } = await supabase
    .from('properties')
    .select('id, images')
    .eq('organization_id', PAMAS_ID);

  console.log(`Total properties: ${properties?.length || 0}`);

  let fixed = 0;
  for (const prop of properties || []) {
    if (!prop.images || prop.images.length === 0) continue;

    // Filter out logo images
    const filtered = prop.images.filter((img) => {
      const lower = img.toLowerCase();
      // Remove logo/MarcaVariacoes
      if (lower.includes('marcavariacoes') || lower.includes('/site/uploads/'))
        return false;
      // Remove very small images (logos, icons)
      // We can't check size from URL, so we rely on pattern matching
      return true;
    });

    if (filtered.length !== prop.images.length) {
      const { error } = await supabase
        .from('properties')
        .update({ images: filtered })
        .eq('id', prop.id);

      if (error) {
        console.error(`Failed to update ${prop.id}:`, error.message);
      } else {
        fixed++;
        console.log(
          `Fixed ${prop.id}: ${prop.images.length} -> ${filtered.length} images`
        );
      }
    }
  }

  console.log(`\nFixed ${fixed} properties`);
}

fixImages().catch(console.error);
