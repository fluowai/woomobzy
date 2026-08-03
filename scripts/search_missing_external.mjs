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

async function searchPamasProperty(title) {
  try {
    const query = encodeURIComponent(title.toLowerCase().trim());
    const url = `https://pamasimoveis.com.br/busca?q=${query}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 15000
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = require('cheerio').load(html);

    const links = [];
    $('a[href*="/imovel/"]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && text) {
        const fullUrl = href.startsWith('/') ? `https://pamasimoveis.com.br${href}` : href;
        links.push({ url: fullUrl, title: text });
      }
    });

    return links;
  } catch (err) {
    return null;
  }
}

async function run() {
  try {
    console.log('=== SEARCHING FOR MISSING EXTERNAL IDs ===\n');

    const { data: missingProps } = await supabase
      .from('properties')
      .select('id, title, external_id, images')
      .eq('organization_id', PAMAS_ID)
      .or('external_id.is.null,external_id.eq.');

    console.log(`Found ${missingProps?.length || 0} properties without external_id\n`);

    let found = 0;
    let notFound = 0;

    for (const prop of missingProps || []) {
      console.log(`Searching: ${prop.title.substring(0, 70)}`);
      const results = await searchPamasProperty(prop.title);

      if (results && results.length > 0) {
        // Find best match
        const bestMatch = results[0];
        console.log(`  FOUND: ${bestMatch.url}`);

        await supabase
          .from('properties')
          .update({ external_id: bestMatch.url })
          .eq('id', prop.id);

        found++;
      } else {
        console.log(`  NOT FOUND`);
        notFound++;
      }

      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\n=== RESULTS ===`);
    console.log(`Found: ${found}`);
    console.log(`Not found: ${notFound}`);

    // Verify final count
    const { data: finalCheck } = await supabase
      .from('properties')
      .select('id, external_id')
      .eq('organization_id', PAMAS_ID);

    const stillMissing = finalCheck?.filter(p => !p.external_id || p.external_id.length === 0).length || 0;
    console.log(`Still missing external_id: ${stillMissing}`);

  } catch (err) {
    console.error('Erro:', err);
  }
}

run();
