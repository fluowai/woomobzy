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
  try {
    console.log('=== CHECKING PAGE 5314 ===\n');

    // Check if this URL is already in DB
    const url =
      'https://pamasimoveis.com.br/imovel/locacao/casas/vinhedo/terras-de-vinhedo-condominio-terras-de-vinhedo/5314';

    const { data: existing } = await supabase
      .from('properties')
      .select('id, title, external_id, images')
      .eq('organization_id', PAMAS_ID)
      .eq('external_id', url)
      .maybeSingle();

    console.log('Already in DB:', existing || 'NO');

    // Also check by title similarity
    const { data: terrasVinhedo } = await supabase
      .from('properties')
      .select('id, title, external_id, images')
      .eq('organization_id', PAMAS_ID)
      .ilike('title', '%Terras de Vinhedo%');

    console.log(
      'Properties with "Terras de Vinhedo" in title:',
      terrasVinhedo?.length || 0
    );
    terrasVinhedo?.forEach((p) => {
      console.log(`  ${p.id}: ${p.title.substring(0, 70)}`);
      console.log(`    external_id: ${p.external_id?.substring(0, 80)}`);
      console.log(`    images: ${p.images?.length || 0}`);
    });

    // Check properties with broken titles (just a dot or very short)
    const { data: brokenTitles } = await supabase
      .from('properties')
      .select('id, title, external_id, images')
      .eq('organization_id', PAMAS_ID)
      .or('title.eq.,title.eq."."');

    console.log(
      `\nProperties with broken titles: ${brokenTitles?.length || 0}`
    );

    // Check the 36 missing ones more carefully
    console.log('\n=== ANALYZING THE 36 MISSING ===');
    const { data: missing } = await supabase
      .from('properties')
      .select('id, title, external_id, images, created_at')
      .eq('organization_id', PAMAS_ID)
      .or('external_id.is.null,external_id.eq.');

    // Group by first few words to see patterns
    const groups = new Map();
    missing?.forEach((p) => {
      const words = p.title.toLowerCase().split(' ').slice(0, 5).join(' ');
      if (!groups.has(words)) groups.set(words, []);
      groups.get(words).push(p);
    });

    console.log('Title patterns:');
    groups.forEach((items, pattern) => {
      console.log(`  "${pattern}": ${items.length} properties`);
    });
  } catch (err) {
    console.error('Erro:', err);
  }
}

run();
