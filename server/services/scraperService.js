import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://www.fazendasbrasil.com.br';

export async function runScraperScrapeOnly(targetUrl, organizationId) {
  try {
    const { data: pageHtml } = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    const $ = cheerio.load(pageHtml);
    const propertyLinks = [];
    
    $('[id^="property-"]').each((i, el) => {
      const id = $(el).attr('id');
      if (id) {
        const link = $(el).find('a[href*="/imoveis/"]').first().attr('href');
        if (link) {
          const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
          if (!propertyLinks.includes(fullUrl)) propertyLinks.push(fullUrl);
        }
      }
    });
    
    const linksToProcess = propertyLinks.slice(0, 25);
    const results = [];
    
    for (let i = 0; i < linksToProcess.length; i++) {
      try {
        const prop = await processPropertyScrapeOnly(linksToProcess[i], organizationId);
        if (prop) results.push(prop);
      } catch (error) {
        console.error(`❌ Erro ao processar item ${i + 1}:`, error.message);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    return results;
  } catch (e) { throw new Error("Erro ao acessar página e tentar extração."); }
}

export async function processPropertyScrapeOnly(url, organizationId) {
  try {
    const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(html);
    
    const title = $('h1').text().trim() || $('h2').first().text().trim() || 'Sem Título';
    const bodyText = $('body').text();
    
    let price = 0;
    let priceText = $('.valor').text().trim() || $('.price').text().trim(); 
    if (!priceText) {
      const match = bodyText.match(/R\$\s?([\d.,]+)/);
      if (match) priceText = match[1];
    }
    if (priceText) price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));

    let city = 'Importado', state = 'BR';
    const titleMatch = title.match(/em\s(.*?)\s-\s([A-Z]{2})/);
    if (titleMatch) { city = titleMatch[1].trim(); state = titleMatch[2].trim(); }
    
    const description = $('.descricao-imovel').text().trim() || $('.description').text().trim() || $('p').text().slice(0, 300);
    
    let area = 0;
    const areaMatch = bodyText.match(/([\d.,]+)\s?(hectares|ha|alqueires)/i);
    if (areaMatch) {
      let val = parseFloat(areaMatch[1].replace('.','').replace(',','.'));
      if (areaMatch[2].toLowerCase().includes('alq')) val *= 48400;
      else val *= 10000;
      area = val;
    }
    
    const images = [];
    $('img').each((i, el) => {
      const src = $(el).attr('src');
      if (src && (src.endsWith('.jpg') || src.endsWith('.png') || src.endsWith('.jpeg')) && !src.includes('logo')) {
        const full = src.startsWith('http') ? src : `${BASE_URL}${src}`;
        if (images.length < 5 && !images.includes(full)) images.push(full);
      }
    });

    return {
      organization_id: organizationId,
      title, description, price: price || 0, type: 'Fazenda', status: 'Disponível',
      city, state, features: { area, bedrooms: 0, bathrooms: 0 }, images, highlighted: true,
      created_at: new Date().toISOString()
    };
  } catch (e) {
    console.error(`⚠️ Erro na extração do imóvel:`, e.message);
    return null;
  }
}
