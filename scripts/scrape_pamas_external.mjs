import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

function buildConnectionString(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete('sslmode');
    u.searchParams.set('uselibpqcompat', 'true');
    return u.toString();
  } catch {
    return url;
  }
}

const client = new Client({
  connectionString: buildConnectionString(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL),
  ssl: { rejectUnauthorized: false }
});

const PAMAS_ID = '836c2313-0c09-4f07-be1a-501ba188e02d';

async function scrapePropertyPage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      timeout: 15000
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract title from multiple possible locations
    const title = $('h1').first().text().trim() ||
                  $('meta[property="og:title"]').attr('content') ||
                  $('title').text().trim();
    
    // Extract images from the embedded JSON data or img tags
    const images = [];
    
    // Try to find images in the page
    $('img').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && src.includes('s3.amazonaws.com/msys-imob-pamasimoveis')) {
        images.push(src);
      }
    });
    
    // Also look for image URLs in inline scripts
    const scripts = $('script').text();
    const s3Matches = scripts.match(/https:\/\/s3\.amazonaws\.com\/msys-imob-pamasimoveis\/[^\s"']+/g) || [];
    s3Matches.forEach(url => {
      if (!images.includes(url)) images.push(url);
    });
    
    return {
      url,
      title: title || '',
      images: [...new Set(images)]
    };
  } catch (err) {
    console.error(`Error scraping ${url}:`, err.message);
    return null;
  }
}

async function run() {
  await client.connect();

  try {
    console.log('=== SCRAPING PAMAS PARA EXTERNAL_ID ===\n');
    
    // 1. Fetch sitemap
    console.log('Fetching sitemap...');
    const sitemapRes = await fetch('https://pamasimoveis.com.br/sitemaps/propertys.xml');
    const xml = await sitemapRes.text();
    const urls = [...xml.matchAll(/<loc>(.+?)<\/loc>/g)].map(m => m[1]);
    console.log(`Found ${urls.length} URLs in sitemap\n`);
    
    // 2. Load existing properties from DB
    const { rows: props } = await client.query(`
      SELECT id, title, external_id, images
      FROM properties
      WHERE organization_id = $1
    `, [PAMAS_ID]);
    
    console.log(`DB properties: ${props.length}`);
    
    // Create lookup by normalized title
    const byTitle = new Map();
    props.forEach(p => {
      const key = p.title.toLowerCase().trim();
      if (!byTitle.has(key)) byTitle.set(key, []);
      byTitle.get(key).push(p);
    });
    
    // 3. Scrape a sample of URLs to test
    const sampleSize = Math.min(10, urls.length);
    console.log(`Scraping sample of ${sampleSize} URLs...\n`);
    
    for (let i = 0; i < sampleSize; i++) {
      const url = urls[i];
      console.log(`[${i + 1}/${sampleSize}] ${url}`);
      
      const data = await scrapePropertyPage(url);
      if (data) {
        console.log(`  Title: ${data.title.substring(0, 70)}`);
        console.log(`  Images: ${data.images.length}`);
        
        // Try to match with DB
        const normalizedTitle = data.title.toLowerCase().trim();
        const matches = byTitle.get(normalizedTitle);
        if (matches && matches.length > 0) {
          console.log(`  MATCHED: ${matches.length} DB property(ies)`);
        } else {
          console.log(`  NO MATCH in DB`);
        }
      } else {
        console.log(`  FAILED`);
      }
      
      // Small delay to be polite
      await new Promise(r => setTimeout(r, 500));
    }
    
    console.log('\n=== READY FOR FULL SCRAPE ===');
    console.log('To scrape all URLs, run with FULL_SCRAPE=true');
    
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await client.end();
  }
}

const FULL_SCRAPE = process.env.FULL_SCRAPE === 'true';

if (FULL_SCRAPE) {
  // Run full scrape
  run();
} else {
  // Run sample
  run();
}
