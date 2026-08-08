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

const PAMAS_ID = '836c2313-0c09-4f07-be1a-501ba188e02d';

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a, b) {
  const s1 = normalizeTitle(a);
  const s2 = normalizeTitle(b);

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  const words1 = new Set(s1.split(' '));
  const words2 = new Set(s2.split(' '));

  let common = 0;
  words1.forEach((w) => {
    if (words2.has(w)) common++;
  });

  const total = new Set([...words1, ...words2]).size;
  return common / total;
}

async function scrapePropertyPage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 15000,
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const title =
      $('h1').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim();

    return { url, title: title || '' };
  } catch (err) {
    return null;
  }
}

async function run() {
  try {
    console.log('=== FUZZY MATCHING MISSING PROPERTIES ===\n');

    const { data: missingProps } = await supabase
      .from('properties')
      .select('id, title, external_id, images')
      .eq('organization_id', PAMAS_ID)
      .or('external_id.is.null,external_id.eq.');

    console.log(`Missing: ${missingProps?.length || 0}`);

    // Fetch sitemap
    console.log('Fetching sitemap...');
    const sitemapRes = await fetch(
      'https://pamasimoveis.com.br/sitemaps/propertys.xml'
    );
    const xml = await sitemapRes.text();
    const urls = [...xml.matchAll(/<loc>(.+?)<\/loc>/g)].map((m) => m[1]);
    console.log(`Sitemap URLs: ${urls.length}\n`);

    // Scrape a sample of URLs to get titles
    console.log('Scraping sample URLs to build title index...');
    const urlTitleMap = new Map();

    const sampleUrls = urls.slice(0, 50);
    for (const url of sampleUrls) {
      const data = await scrapePropertyPage(url);
      if (data && data.title) {
        urlTitleMap.set(url, data.title);
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log(`Indexed ${urlTitleMap.size} URLs\n`);

    // Try fuzzy matching
    let matched = 0;
    let notFound = 0;

    for (const prop of missingProps || []) {
      console.log(`Matching: ${prop.title.substring(0, 70)}`);

      let bestMatch = null;
      let bestScore = 0;

      for (const [url, title] of urlTitleMap) {
        const score = similarity(prop.title, title);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { url, title, score };
        }
      }

      if (bestMatch && bestScore >= 0.7) {
        console.log(
          `  MATCH (${(bestScore * 100).toFixed(0)}%): ${bestMatch.title.substring(0, 70)}`
        );
        console.log(`  URL: ${bestMatch.url}`);

        await supabase
          .from('properties')
          .update({ external_id: bestMatch.url })
          .eq('id', prop.id);

        matched++;
      } else {
        console.log(`  NO MATCH (best: ${(bestScore * 100).toFixed(0)}%)`);
        notFound++;
      }
    }

    console.log(`\n=== RESULTS ===`);
    console.log(`Matched: ${matched}`);
    console.log(`Not found: ${notFound}`);

    // Check remaining
    const { data: remaining } = await supabase
      .from('properties')
      .select('id, title')
      .eq('organization_id', PAMAS_ID)
      .or('external_id.is.null,external_id.eq.');

    console.log(`Still missing: ${remaining?.length || 0}`);
  } catch (err) {
    console.error('Erro:', err);
  }
}

run();
