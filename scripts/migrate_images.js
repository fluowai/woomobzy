
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://www.fazendasbrasil.com.br';
const LISTING_URL_TEMPLATE = 'https://www.fazendasbrasil.com.br/imobiliaria/imoveis/0/';

let dbProperties = [];

async function loadAllProperties() {
  console.log('Loading all properties from DB...');
  const { data, error } = await supabase
    .from('properties')
    .select('id, title, images');
  
  if (error) {
    console.error('Error loading properties:', error);
    process.exit(1);
  }
  dbProperties = data;
  console.log(`Loaded ${dbProperties.length} properties.`);
}

async function ensureBucket() {
  const { data, error } = await supabase.storage.getBucket('properties');
  if (error && error.message.includes('not found')) {
    console.log('Creating "properties" bucket...');
    const { error: createError } = await supabase.storage.createBucket('properties', {
      public: true
    });
    if (createError) console.error('Error creating bucket:', createError);
  } else if (data) {
    console.log('Bucket "properties" exists.');
  }
}

async function downloadImage(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return { data: response.data, contentType: response.headers['content-type'] };
  } catch (error) {
    console.error(`Failed to download image ${url}:`, error.message);
    return null;
  }
}

async function uploadToSupabase(buffer, contentType, filename) {
  const { data, error } = await supabase.storage
    .from('properties')
    .upload(filename, buffer, {
      contentType: contentType,
      upsert: true
    });

  if (error) {
    console.error('Supabase upload error:', error);
    return null;
  }

  const { data: publicData } = supabase.storage
    .from('properties')
    .getPublicUrl(filename);
    
  return publicData.publicUrl;
}

function tokenize(str) {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/g)
    .filter(t => t.length > 2); // Ignore short words like 'em', 'de', 'no'
}

function calculateJaccard(tokens1, tokens2) {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

function findBestMatch(scrapedTitle) {
  const scrapedTokens = tokenize(scrapedTitle);
  let bestMatch = null;
  let maxScore = 0;

  for (const p of dbProperties) {
      const dbTokens = tokenize(p.title);
      const score = calculateJaccard(scrapedTokens, dbTokens);
      
      if (score > maxScore) {
          maxScore = score;
          bestMatch = p;
      }
  }

  // Threshold: 0.5 means at least 50% unique words shared
  if (maxScore > 0.4) {
      console.log(`\nMatch Found! Score: ${maxScore.toFixed(2)}`);
      console.log(`   Scraped: "${scrapedTitle}"`);
      console.log(`   DB:      "${bestMatch.title}"`);
      return bestMatch;
  }

  return null;
}

async function processPage(pageNum) {
  const url = `${LISTING_URL_TEMPLATE}${pageNum}`;
  console.log(`Scraping ${url}...`);
  
  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    let processedCount = 0;

    const cards = $('a[href*="/imoveis/"]'); 
    console.log(`Found ${cards.length} cards on page ${pageNum}`); // DEBUG

    if (cards.length > 0) {
      console.log('First card structure:', $(cards[0]).html().substring(0, 100)); // DEBUG
    }
    
    for (const el of cards) {
        const card = $(el);
        const titleEl = card.find('h3');
        if (titleEl.length === 0) continue;

        const title = titleEl.text().trim();
        const imgEl = card.find('img');
        let imgSrc = imgEl.attr('src');

        // Handle relative URLs
        if (imgSrc && !imgSrc.startsWith('http')) {
             if (imgSrc.startsWith('/')) {
                 imgSrc = `https://www.fazendasbrasil.com.br${imgSrc}`;
             } else {
                  imgSrc = `https://www.fazendasbrasil.com.br/${imgSrc}`;
             }
        }
        
        if (!imgSrc || imgSrc.includes('sem_foto')) continue;

        const property = findBestMatch(title);
        
        if (property) {
           console.log(`✅ MATCH: "${title}" -> DB: "${property.title}"`);
           
           if (property.images && property.images.length > 0 && property.images[0].includes('supabase')) {
               console.log('Skipping: Already valid');
               continue;
           }

           console.log(`   Downloading ${imgSrc}...`);
           const imageResult = await downloadImage(imgSrc);
           
           if (imageResult) {
               const ext = path.extname(imgSrc) || '.jpg';
               const filename = `${property.id}/${Date.now()}${ext}`;
               
               console.log('   Uploading...');
               const publicUrl = await uploadToSupabase(imageResult.data, imageResult.contentType, filename);
               
               if (publicUrl) {
                   console.log(`   Updated DB!`);
                   await supabase
                     .from('properties')
                     .update({ images: [publicUrl] }) 
                     .eq('id', property.id);
                   
                   // Update local cache to avoid duplicate work
                   property.images = [publicUrl];
                   processedCount++;
               }
           }
        } else {
            console.log(`❌ No match: "${title}"`);
        }
    }
    
    return processedCount;

  } catch (error) {
    if (error.response && error.response.status === 404) {
        return -1; 
    }
    console.error('Error processing page:', error.message);
    return 0;
  }
}

async function run() {
  await ensureBucket();
  await loadAllProperties();
  
  let page = 1;
  let consecutiveEmptyPages = 0;

  while (true) {
      const processed = await processPage(page);
      
      if (processed === -1 || (processed === 0 && consecutiveEmptyPages > 4)) {
          console.log('Finished.');
          break;
      }

      if (processed === 0) consecutiveEmptyPages++;
      else consecutiveEmptyPages = 0;

      page++;
      await new Promise(r => setTimeout(r, 1000));
  }
}

run();
