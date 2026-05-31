#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { isLegacySupabaseStorageUrl, uploadStorageObject } from './lib/storage-client.mjs';

dotenv.config();

const apply = process.argv.includes('--apply');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Configure VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const { data: properties, error } = await supabase
  .from('properties')
  .select('id, organization_id, title, images')
  .not('images', 'is', null);

if (error) {
  console.error('Erro ao carregar propriedades:', error.message);
  process.exit(1);
}

let scanned = 0;
let legacy = 0;
let updated = 0;

for (const property of properties || []) {
  scanned++;
  const images = Array.isArray(property.images) ? property.images : [];
  const legacyImages = images.filter(isLegacySupabaseStorageUrl);

  if (legacyImages.length === 0) continue;
  legacy += legacyImages.length;

  console.log(`\n${property.title || property.id}: ${legacyImages.length} URL(s) legada(s)`);

  if (!apply) {
    legacyImages.forEach((url) => console.log(`  dry-run: ${url}`));
    continue;
  }

  const nextImages = [];
  for (let index = 0; index < images.length; index += 1) {
    const imageUrl = images[index];
    if (!isLegacySupabaseStorageUrl(imageUrl)) {
      nextImages.push(imageUrl);
      continue;
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`download ${response.status}`);

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const body = Buffer.from(await response.arrayBuffer());
      const ext = extensionFromContentType(contentType);
      const path = `${property.organization_id || 'orphan'}/reconciled/${property.id}_${Date.now()}_${index}${ext}`;
      const uploaded = await uploadStorageObject({
        supabase,
        bucket: 'property-images',
        path,
        body,
        contentType,
      });
      nextImages.push(uploaded.publicUrl);
      console.log(`  migrated: ${uploaded.publicUrl}`);
    } catch (migrationError) {
      console.error(`  failed: ${migrationError.message}`);
      nextImages.push(imageUrl);
    }
  }

  const { error: updateError } = await supabase
    .from('properties')
    .update({ images: nextImages })
    .eq('id', property.id);

  if (updateError) {
    console.error(`  update failed: ${updateError.message}`);
  } else {
    updated++;
  }
}

console.log(`\nScanned: ${scanned}`);
console.log(`Legacy URLs: ${legacy}`);
console.log(`Updated properties: ${updated}`);
console.log(apply ? 'Mode: apply' : 'Mode: dry-run. Use --apply para migrar.');

function extensionFromContentType(contentType) {
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('gif')) return '.gif';
  return '.jpg';
}
