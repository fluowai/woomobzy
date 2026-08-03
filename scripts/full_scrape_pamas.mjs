import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { Client } from 'pg';
import dotenv from 'dotenv';
import * as Minio from 'minio';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

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

const minioClient = new Minio.Client({
  endPoint: (process.env.MINIO_ENDPOINT || '').replace(/^https?:\/\//, ''),
  port: 443,
  useSSL: true,
  accessKey: (process.env.MINIO_ACCESS_KEY || '').replace(/['"]/g, ''),
  secretKey: (process.env.MINIO_SECRET_KEY || '').replace(/['"]/g, ''),
  pathStyle: true
});

const PAMAS_ID = '836c2313-0c09-4f07-be1a-501ba188e02d';
const BUCKET = process.env.MINIO_MEDIA_BUCKET || 'imobfluow';
const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL || process.env.VITE_MINIO_PUBLIC_URL || 'https://s.wootech.com.br';

async function scrapePropertyPage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
      if (src && src.includes('s3.amazonaws.com/msys-imob-pamasimoveis')) {
        images.add(src);
      }
    });
    
    const scripts = $('script').text();
    const s3Matches = scripts.match(/https:\/\/s3\.amazonaws\.com\/msys-imob-pamasimoveis\/[^\s"']+/g) || [];
    s3Matches.forEach(url => images.add(url));
    
    return {
      url,
      title: title || '',
      images: Array.from(images)
    };
  } catch (err) {
    return null;
  }
}

async function uploadImageToMinio(imageUrl, prefix) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const filename = `${prefix}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    
    await minioClient.putObject(BUCKET, filename, buffer, buffer.length, {
      'Content-Type': `image/${ext === 'jpg' ? 'jpeg' : ext}`
    });
    
    return `${MINIO_PUBLIC_URL}/${BUCKET}/${filename}`;
  } catch (err) {
    console.error(`  Failed to upload image: ${err.message}`);
    return null;
  }
}

async function run() {
  await client.connect();
  
  try {
    console.log('=== FULL SCRAPE PAMAS ===\n');
    
    // Load DB properties
    const { rows: props } = await client.query(`
      SELECT id, title, external_id, images
      FROM properties
      WHERE organization_id = $1
    `, [PAMAS_ID]);
    
    console.log(`DB properties: ${props.length}`);
    
    const byTitle = new Map();
    const byId = new Map();
    props.forEach(p => {
      const key = p.title.toLowerCase().trim();
      if (!byTitle.has(key)) byTitle.set(key, []);
      byTitle.get(key).push(p);
      byId.set(p.id, p);
    });
    
    // Fetch sitemap
    console.log('Fetching sitemap...');
    const sitemapRes = await fetch('https://pamasimoveis.com.br/sitemaps/propertys.xml');
    const xml = await sitemapRes.text();
    const urls = [...xml.matchAll(/<loc>(.+?)<\/loc>/g)].map(m => m[1]);
    console.log(`Sitemap URLs: ${urls.length}\n`);
    
    let matched = 0;
    let unmatched = 0;
    let updatedExternalId = 0;
    let newImagesUploaded = 0;
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      process.stdout.write(`[${i + 1}/${urls.length}] ${url.substring(0, 70)}... `);
      
      const data = await scrapePropertyPage(url);
      if (!data || !data.title) {
        console.log('FAILED');
        continue;
      }
      
      const normalizedTitle = data.title.toLowerCase().trim();
      const matches = byTitle.get(normalizedTitle);
      
      if (matches && matches.length > 0) {
        matched++;
        console.log(`MATCHED (${data.images.length} images)`);
        
        // Update external_id for all matches
        for (const match of matches) {
          if (!match.external_id || match.external_id !== url) {
            await client.query(`
              UPDATE properties SET external_id = $1 WHERE id = $2
            `, [url, match.id]);
            updatedExternalId++;
          }
          
          // If property has no images but we found images on the website, upload them
          if ((!match.images || match.images.length === 0) && data.images.length > 0) {
            console.log(`  Uploading ${data.images.length} images for ${match.id}...`);
            const uploadedUrls = [];
            
            for (const imgUrl of data.images.slice(0, 10)) {
              const publicUrl = await uploadImageToMinio(imgUrl, `pamas/${match.id}`);
              if (publicUrl) uploadedUrls.push(publicUrl);
            }
            
            if (uploadedUrls.length > 0) {
              await client.query(`
                UPDATE properties SET images = $1 WHERE id = $2
              `, [uploadedUrls, match.id]);
              newImagesUploaded++;
              console.log(`  Uploaded ${uploadedUrls.length} images`);
            }
          }
        }
      } else {
        unmatched++;
        console.log(`NO MATCH: "${data.title.substring(0, 50)}"`);
      }
      
      // Delay to be polite
      await new Promise(r => setTimeout(r, 300));
    }
    
    console.log('\n=== RESULTS ===');
    console.log(`Matched: ${matched}`);
    console.log(`Unmatched: ${unmatched}`);
    console.log(`Updated external_id: ${updatedExternalId}`);
    console.log(`New images uploaded: ${newImagesUploaded}`);
    
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await client.end();
  }
}

run();
