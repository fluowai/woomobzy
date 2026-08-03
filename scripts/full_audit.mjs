import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import * as Minio from 'minio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const minioClient = new Minio.Client({
  endPoint: (process.env.MINIO_ENDPOINT || '').replace(/^https?:\/\//, ''),
  port: 443,
  useSSL: true,
  accessKey: (process.env.MINIO_ACCESS_KEY || '').replace(/['"]/g, ''),
  secretKey: (process.env.MINIO_SECRET_KEY || '').replace(/['"]/g, ''),
  pathStyle: true
});

const PAMAS_ID = '836c2313-0c09-4f07-be1a-501ba188e02d';
const MEGA_ID = '52757ffb-dd3a-4106-8783-31ebe01a1455';

async function scrapePamas() {
  console.log('=== SCRAPING PAMASIMOVEIS ===');
  const sitemapUrl = 'https://pamasimoveis.com.br/sitemaps/propertys.xml';
  
  try {
    const res = await fetch(sitemapUrl);
    const xml = await res.text();
    const urls = [...xml.matchAll(/<loc>(.+?)<\/loc>/g)].map(m => m[1]);
    console.log(`Found ${urls.length} URLs in sitemap`);
    
    // Just return the URLs for now - we'll process them in batches
    return urls;
  } catch (err) {
    console.error('Error scraping Pamas sitemap:', err.message);
    return [];
  }
}

async function scrapeMega() {
  console.log('=== SCRAPING MEGA INVESTIMENTOS ===');
  const BASE_URL = 'https://megainvestimoveis.com.br';
  const pagesToScrape = [`${BASE_URL}/venda`, `${BASE_URL}/aluguel`];
  const propertyLinks = new Set();
  
  for (const pageUrl of pagesToScrape) {
    try {
      const html = await fetch(pageUrl).then(r => r.text());
      const $ = require('cheerio').load(html);
      $('a[href*="/imovel/"]').each((i, el) => {
        let link = $(el).attr('href');
        if (link.startsWith('/')) link = BASE_URL + link;
        propertyLinks.add(link);
      });
    } catch (err) {
      console.error(`Error scraping ${pageUrl}:`, err.message);
    }
  }
  
  console.log(`Found ${propertyLinks.size} unique property URLs from Mega`);
  return Array.from(propertyLinks);
}

async function checkMinIOForOrg(orgId, orgName) {
  console.log(`\n=== MINIO OBJECTS FOR ${orgName} ===`);
  try {
    const objects = [];
    const stream = minioClient.listObjectsV2(process.env.MINIO_MEDIA_BUCKET || 'imobfluow', orgId + '/', true);
    
    for await (const obj of stream) {
      if (obj.name) {
        objects.push(obj.name);
      }
    }
    
    console.log(`Found ${objects.length} objects for ${orgName}`);
    if (objects.length > 0) {
      console.log('Sample objects:');
      objects.slice(0, 5).forEach(obj => {
        console.log(`  ${obj}`);
      });
    }
    return objects;
  } catch (err) {
    console.error(`Error listing MinIO objects for ${orgName}:`, err.message);
    return [];
  }
}

async function run() {
  console.log('Starting comprehensive migration audit...\n');
  
  // 1. Check current DB state
  console.log('=== DATABASE STATE ===');
  const { data: pamasProps, error: pErr } = await supabase
    .from('properties')
    .select('id, title, external_id, images, status')
    .eq('organization_id', PAMAS_ID);
    
  const { data: megaProps, error: mErr } = await supabase
    .from('properties')
    .select('id, title, external_id, images, status')
    .eq('organization_id', MEGA_ID);
    
  if (pErr) console.error('Error fetching Pamas:', pErr);
  if (mErr) console.error('Error fetching Mega:', mErr);
  
  console.log(`Pamas: ${pamasProps?.length || 0} properties`);
  console.log(`Mega: ${megaProps?.length || 0} properties`);
  
  // 2. Check MinIO
  const pamasObjects = await checkMinIOForOrg(PAMAS_ID, 'PAMAS');
  const megaObjects = await checkMinIOForOrg(MEGA_ID, 'MEGA');
  
  // 3. Scrape websites
  const pamasUrls = await scrapePamas();
  const megaUrls = await scrapeMega();
  
  // 4. Compare counts
  console.log('\n=== COMPARISON ===');
  console.log(`Pamas DB: ${pamasProps?.length || 0} | Pamas Website: ${pamasUrls.length}`);
  console.log(`Mega DB: ${megaProps?.length || 0} | Mega Website: ${megaUrls.length}`);
  
  // 5. Find missing properties
  const pamasExternalIds = new Set((pamasProps || []).map(p => p.external_id).filter(Boolean));
  const megaExternalIds = new Set((megaProps || []).map(p => p.external_id).filter(Boolean));
  
  console.log(`\nPamas with external_id: ${pamasExternalIds.size}`);
  console.log(`Mega with external_id: ${megaExternalIds.size}`);
  
  // 6. Check for properties that should be in DB but aren't
  const missingFromPamas = pamasUrls.filter(url => !pamasExternalIds.has(url));
  const missingFromMega = megaUrls.filter(url => !megaExternalIds.has(url));
  
  console.log(`\nMissing from Pamas DB: ${missingFromPamas.length}`);
  console.log(`Missing from Mega DB: ${missingFromMega.length}`);
  
  if (missingFromPamas.length > 0) {
    console.log('Sample missing Pamas URLs:');
    missingFromPamas.slice(0, 5).forEach(url => console.log(`  ${url}`));
  }
  
  if (missingFromMega.length > 0) {
    console.log('Sample missing Mega URLs:');
    missingFromMega.slice(0, 5).forEach(url => console.log(`  ${url}`));
  }
}

run().catch(console.error);
