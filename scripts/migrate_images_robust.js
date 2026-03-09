
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://www.fazendasbrasil.com.br';
const LISTING_URL_TEMPLATE = 'https://www.fazendasbrasil.com.br/imobiliaria/imoveis/0/';

let dbProperties = [];

async function loadAllProperties() {
  console.log('Loading properties...');
  const { data, error } = await supabase.from('properties').select('id, title, images');
  if (error) throw error;
  dbProperties = data;
  console.log(`Loaded ${dbProperties.length} records.`);
}

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ' ') // Collapse spaces
    .replace(/[^a-z0-9 ]/g, '') // Keep spaces to tokenize later
    .trim();
}

function tokenize(str) {
  return normalize(str).split(' ').filter(t => t.length > 2);
}

function calculateJaccard(tokens1, tokens2) {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

async function downloadAndUpload(property, imgSrc) {
  try {
    const { data, headers } = await axios.get(imgSrc, { responseType: 'arraybuffer' });
    const ext = path.extname(imgSrc) || '.jpg';
    const filename = `${property.id}/${Date.now()}${ext}`;
    
    // Upload
    const { error: upErr } = await supabase.storage
      .from('properties')
      .upload(filename, data, { contentType: headers['content-type'], upsert: true });

    if (upErr) throw upErr;

    // Get URL
    const { data: pubData } = supabase.storage.from('properties').getPublicUrl(filename);
    const publicUrl = pubData.publicUrl;

    // Update DB
    await supabase.from('properties')
      .update({ images: [publicUrl] })
      .eq('id', property.id);
      
    console.log(`   UPDATED: ${property.title}`);
    return true;
  } catch (err) {
    console.error(`   Error uploading ${imgSrc}: ${err.message}`);
    return false;
  }
}

async function run() {
  await loadAllProperties();
  
  let page = 1;
  let matches = 0;
  
  while (true) {
    const url = `${LISTING_URL_TEMPLATE}${page}`;
    console.log(`Scanning page ${page}...`);
    
    try {
      const { data: html } = await axios.get(url);
      const $ = cheerio.load(html);
      const cards = $('a[href*="/imoveis/"]');
      
      if (cards.length === 0) {
        if (page > 1) break; // Stop if empty after page 1
      }
      
      for (const el of cards) {
        const titleEl = $(el).find('h3');
        if (!titleEl.length) continue;
        
        const scrapedTitle = titleEl.text().trim();
        const tokensScraped = tokenize(scrapedTitle);
        if (tokensScraped.length === 0) continue;
        
        // Find best DB match
        let bestP = null;
        let maxScore = 0;
        
        for (const p of dbProperties) {
           // Skip if already has supabase image
           if (p.images && p.images[0]?.includes('supabase')) continue;
           
           const tokensDB = tokenize(p.title);
           const score = calculateJaccard(tokensScraped, tokensDB);
           
           // DEBUG
           if (score > 0.5) {
               console.log(`   Candidate: ${p.title} (Score: ${score.toFixed(2)})`);
               console.log(`      Tokens Scraped: ${tokensScraped.join('|')}`);
               console.log(`      Tokens DB:      ${tokensDB.join('|')}`);
           }

           if (score > maxScore) {
             maxScore = score;
             bestP = p;
           }
        }
        
        if (maxScore > 0.5) { // Lowered to 0.5
            const imgEl = $(el).find('img');
            let src = imgEl.attr('src') || imgEl.attr('data-src'); // Check data-src
            
            // Regex fallback if selector fails
            if (!src) {
                const html = $(el).html();
                console.log(`   [DEBUG] Card HTML: ${html.substring(0, 150)}...`); 
                const match = html.match(/https?:\/\/[^"']+(?:jpg|png|jpeg)/i) || html.match(/\/admin\/imovel\/mini\/[^"']+/);
                if (match) {
                    src = match[0];
                    console.log(`   [INFO] Found image via Regex: ${src}`);
                }
            }

            // Fix relative
            if (src && !src.startsWith('http')) {
                src = src.startsWith('/') ? `${BASE_URL}${src}` : `${BASE_URL}/${src}`;
            }
            
            if (src && !src.includes('sem_foto')) {
                console.log(`MATCH (${maxScore.toFixed(2)}): ${scrapedTitle}`);
                await downloadAndUpload(bestP, src);
                matches++;
                // Mark locally as done
                bestP.images = ['supabase_placeholder']; 
            }
        }
      }
      
      page++;
      if (page > 10) break; // Safety limit
      
    } catch (e) {
      if (e.response?.status === 404) break;
      console.error(e.message);
    }
  }
  
  console.log(`Migration complete. Updated ${matches} properties.`);
}

run();
