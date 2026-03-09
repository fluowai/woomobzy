
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const MIN_MATCH_THRESHOLD = 0.5;

function tokenize(str) {
  if (!str) return [];
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .split(' ')
    .filter(t => t.length > 2);
}

function calculateJaccard(tokens1, tokens2) {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

async function run() {
  if (!fs.existsSync('scraped_data.json')) {
      console.log('scraped_data.json not found. Run browser subagent first.');
      return;
  }
  
  const scrapedData = JSON.parse(fs.readFileSync('scraped_data.json', 'utf8'));
  console.log(`Loaded ${scrapedData.length} scraped items.`);
  
  const { data: dbProps } = await supabase.from('properties').select('id, title, images');
  console.log(`Loaded ${dbProps.length} DB properties.`);
  
  let updated = 0;

  for (const item of scrapedData) {
      if (!item.imageUrl || item.imageUrl.includes('sem_foto')) continue;
      
      const tokensScraped = tokenize(item.title);
      let bestP = null;
      let maxScore = 0;
      
      for (const p of dbProps) {
          // Skip if already has supabase image
          if (p.images && p.images[0]?.includes('supabase')) continue;
          
          const tokensDB = tokenize(p.title);
          const score = calculateJaccard(tokensScraped, tokensDB);
          
          if (score > maxScore) {
              maxScore = score;
              bestP = p;
          }
      }
      
      if (maxScore > MIN_MATCH_THRESHOLD) {
          console.log(`MATCH (${maxScore.toFixed(2)}): ${item.title}`);
          
          try {
              const { data, headers } = await axios.get(item.imageUrl, { responseType: 'arraybuffer' });
              const ext = path.extname(item.imageUrl) || '.jpg';
              // Fallback extension if none
              const finalExt = ext.length > 5 ? '.jpg' : ext;

              const filename = `${bestP.id}/${Date.now()}${finalExt}`;
              
              const { error: upErr } = await supabase.storage.from('properties').upload(filename, data, {
                  contentType: headers['content-type'],
                  upsert: true
              });
              
              if (upErr) throw upErr;
              
              const { data: pub } = supabase.storage.from('properties').getPublicUrl(filename);
              
              await supabase.from('properties').update({ images: [pub.publicUrl] }).eq('id', bestP.id);
              console.log(`   UPDATED ID ${bestP.id}`);
              
              // Local update to avoid processing again
              bestP.images = ['supabase_placeholder'];
              updated++;
          } catch (e) {
              console.error(`   Failed to upload: ${e.message}`);
          }
      }
  }
  
  console.log(`Job complete. Updated ${updated} properties.`);
}

run();
