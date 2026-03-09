
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://www.fazendasbrasil.com.br/imobiliaria/imoveis/0/1';

async function run() {
  console.log('--- DIAGNOSTIC RUN ---');
  
  // 1. Get DB Titles
  const { data: dbProps } = await supabase.from('properties').select('title');
  const dbTitles = dbProps.map(p => p.title).sort();
  
  // 2. Get Scraped Titles
  const { data: html } = await axios.get(BASE_URL);
  const $ = cheerio.load(html);
  const scrapedTitles = [];
  $('a[href*="/imoveis/"] h3').each((i, el) => {
      scrapedTitles.push($(el).text().trim());
  });

  const report = [
      '--- DB TITLES (First 10) ---',
      ...dbTitles.slice(0, 10),
      '\n--- SCRAPED TITLES (First 10) ---',
      ...scrapedTitles.slice(0, 10)
  ].join('\n');

  console.log(report);
  fs.writeFileSync('migration_report.txt', report);
}

run();
