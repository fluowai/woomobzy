import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'C:/Users/paulo/OneDrive/Área de Trabalho/IMOBZY/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPamasData() {
  const PAMAS_ID = '836c2313-0c09-4f07-be1a-501ba188e02d';

  // Get all PAMAS properties
  const { data: properties } = await supabase
    .from('properties')
    .select('id, title, external_id, images, price, status')
    .eq('organization_id', PAMAS_ID)
    .order('created_at');

  console.log(`Total properties: ${properties?.length || 0}`);

  // 1. Fix broken titles (empty or just a dot)
  const brokenTitles =
    properties?.filter(
      (p) => !p.title || p.title === '.' || p.title.trim() === ''
    ) || [];
  console.log(`\nBroken titles: ${brokenTitles.length}`);
  for (const prop of brokenTitles) {
    const { error } = await supabase
      .from('properties')
      .update({ title: 'Imóvel sem título' })
      .eq('id', prop.id);

    if (error) {
      console.error(`Failed to fix title for ${prop.id}:`, error.message);
    } else {
      console.log(`Fixed title for ${prop.id}`);
    }
  }

  // 2. Find and handle duplicate external_ids
  const byExternal = new Map();
  properties?.forEach((p) => {
    const key = p.external_id || '(sem external_id)';
    if (!byExternal.has(key)) byExternal.set(key, []);
    byExternal.get(key).push(p);
  });

  const duplicates = [...byExternal.entries()].filter(([k, v]) => v.length > 1);
  console.log(`\nDuplicate external_ids: ${duplicates.length}`);

  let deleted = 0;
  for (const [ext, props] of duplicates) {
    console.log(
      `\nDuplicate: ${ext?.substring(0, 80)} (${props.length} properties)`
    );

    // Sort by: has images > no images, then by created_at (keep oldest with most data)
    const sorted = props.sort((a, b) => {
      const aHasImages = a.images && a.images.length > 0 ? 1 : 0;
      const bHasImages = b.images && b.images.length > 0 ? 1 : 0;
      if (bHasImages !== aHasImages) return bHasImages - aHasImages;
      return new Date(a.created_at) - new Date(b.created_at);
    });

    // Keep the first one, delete the rest
    const toKeep = sorted[0];
    const toDelete = sorted.slice(1);

    console.log(
      `  Keeping: ${toKeep.id} (${toKeep.title?.substring(0, 50)}, ${toKeep.images?.length || 0} images)`
    );

    for (const prop of toDelete) {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', prop.id);

      if (error) {
        console.error(`  Failed to delete ${prop.id}:`, error.message);
      } else {
        deleted++;
        console.log(`  Deleted: ${prop.id} (${prop.title?.substring(0, 50)})`);
      }
    }
  }

  console.log(`\nDeleted ${deleted} duplicate properties`);

  // 3. Verify final state
  const { data: finalProps } = await supabase
    .from('properties')
    .select('id, title, external_id, images')
    .eq('organization_id', PAMAS_ID);

  const withImages =
    finalProps?.filter((p) => p.images && p.images.length > 0) || [];
  const withoutImages =
    finalProps?.filter((p) => !p.images || p.images.length === 0) || [];

  console.log(`\n=== FINAL STATE ===`);
  console.log(`Total properties: ${finalProps?.length || 0}`);
  console.log(`With images: ${withImages.length}`);
  console.log(`Without images: ${withoutImages.length}`);

  if (withoutImages.length > 0) {
    console.log('Properties without images:');
    withoutImages.forEach((p) => {
      console.log(`  ${p.id}: ${p.title?.substring(0, 50)}`);
    });
  }
}

fixPamasData().catch(console.error);
