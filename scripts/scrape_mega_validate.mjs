import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
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

const MEGA_ID = '52757ffb-dd3a-4106-8783-31ebe01a1455';

async function scrapeMegaPropertyPage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 15000
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('h1').first().text().trim() ||
                  $('meta[property="og:title"]').attr('content') ||
                  $('title').text().trim();

    const images = new Set();

    $('img').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (!src) return;
      const lower = src.toLowerCase();
      if (lower.includes('imovel') || lower.includes('fotos') || lower.includes('megainvest')) {
        if (src.startsWith('/')) {
          images.add('https://megainvestimoveis.com.br' + src);
        } else {
          images.add(src);
        }
      }
    });

    const scripts = $('script').text();
    const imgMatches = scripts.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp)/gi) || [];
    imgMatches.forEach(url => {
      const lower = url.toLowerCase();
      if (lower.includes('imovel') || lower.includes('fotos') || lower.includes('megainvest')) {
        images.add(url);
      }
    });

    return {
      url,
      title: title || '',
      images: Array.from(images)
    };
  } catch (err) {
    return null;
  }
}

async function run() {
  try {
    console.log('=== SCRAPING MEGA INVESTIMENTOS ===\n');

    const { data: props } = await supabase
      .from('properties')
      .select('id, title, external_id, images')
      .eq('organization_id', MEGA_ID);

    console.log(`DB properties: ${props?.length || 0}`);

    const byTitle = new Map();
    props?.forEach(p => {
      const key = p.title.toLowerCase().trim();
      if (!byTitle.has(key)) byTitle.set(key, []);
      byTitle.get(key).push(p);
    });

    const pagesToScrape = [
      'https://megainvestimoveis.com.br/venda',
      'https://megainvestimoveis.com.br/aluguel'
    ];

    const propertyLinks = new Set();

    for (const pageUrl of pagesToScrape) {
      console.log(`Scraping list page: ${pageUrl}`);
      try {
        const html = await fetch(pageUrl).then(r => r.text());
        const $ = cheerio.load(html);

        $('a[href*="/imovel/"]').each((i, el) => {
          let link = $(el).attr('href');
          if (link.startsWith('/')) link = 'https://megainvestimoveis.com.br' + link;
          propertyLinks.add(link);
        });
      } catch (err) {
        console.error(`Error scraping ${pageUrl}:`, err.message);
      }
    }

    console.log(`Found ${propertyLinks.size} unique property URLs\n`);

    let matched = 0;
    let unmatched = 0;
    let newProperties = 0;
    let updatedImages = 0;

    const urls = Array.from(propertyLinks);
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      process.stdout.write(`[${i + 1}/${urls.length}] ${url.substring(0, 70)}... `);

      const data = await scrapeMegaPropertyPage(url);
      if (!data || !data.title) {
        console.log('FAILED');
        continue;
      }

      const normalizedTitle = data.title.toLowerCase().trim();
      const matches = byTitle.get(normalizedTitle);

      if (matches && matches.length > 0) {
        matched++;
        console.log(`MATCHED (${data.images.length} images)`);

        for (const match of matches) {
          if (!match.external_id || match.external_id !== url) {
            await supabase
              .from('properties')
              .update({ external_id: url })
              .eq('id', match.id);
          }

          if ((!match.images || match.images.length === 0) && data.images.length > 0) {
            await supabase
              .from('properties')
              .update({ images: data.images.slice(0, 20) })
              .eq('id', match.id);
            updatedImages++;
          }
        }
      } else {
        unmatched++;
        console.log(`NEW: "${data.title.substring(0, 50)}" (${data.images.length} images)`);

        if (data.images.length > 0) {
          const { data: newProp, error } = await supabase
            .from('properties')
            .insert({
              organization_id: MEGA_ID,
              title: data.title,
              external_id: url,
              images: data.images.slice(0, 20),
              status: 'Disponível',
              purpose: 'Venda',
              property_type: 'Apartamento',
              niche: 'urbano'
            })
            .select()
            .single();

          if (!error && newProp) {
            newProperties++;
            console.log(`  INSERTED: ${newProp.id}`);
          }
        }
      }

      await new Promise(r => setTimeout(r, 300));
    }

    console.log('\n=== RESULTS ===');
    console.log(`Matched: ${matched}`);
    console.log(`Unmatched/New: ${unmatched}`);
    console.log(`New properties inserted: ${newProperties}`);
    console.log(`Updated images: ${updatedImages}`);

    const { count } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', MEGA_ID);

    console.log(`\nTotal Mega properties now: ${count}`);
  } catch (err) {
    console.error('Erro:', err);
  }
}

run();
