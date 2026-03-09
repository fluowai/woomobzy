import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://www.fazendasbrasil.com.br';

async function testOne() {
    const url = 'https://www.fazendasbrasil.com.br/25/imoveis/venda-sitio-zona-rural-belo-horizonte-mg';
    
    console.log(`🧪 Testando processamento de: ${url}\n`);
    
    try {
        const { data: html } = await axios.get(url, {
             headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(html);

        const title = $('h1').text().trim() || $('h2').first().text().trim() || 'Sem Título';
        const bodyText = $('body').text();

        let price = 0;
        let priceText = $('.valor').text().trim() || $('.price').text().trim(); 
        if (!priceText) {
            const match = bodyText.match(/R\$\s?([\d.,]+)/);
            if (match) priceText = match[1];
        }
        if (priceText) {
             price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
        }

        let city = 'Importado'; 
        let state = 'BR';
        const titleMatch = title.match(/em\s(.*?)\s-\s([A-Z]{2})/);
        if (titleMatch) {
            city = titleMatch[1].trim();
            state = titleMatch[2].trim();
        }

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
            if (src && (src.endsWith('.jpg') || src.endsWith('.png')) && !src.includes('logo')) {
                const full = src.startsWith('http') ? src : `${BASE_URL}${src}`;
                if (images.length < 10 && !images.includes(full)) images.push(full);
            }
        });

        const propertyData = {
            title,
            description,
            price: price || 0,
            type: 'Fazenda',
            status: 'Disponível',
            city,
            state, 
            features: { area, bedrooms: 0, bathrooms: 0 },
            images,
            highlighted: true,
            created_at: new Date().toISOString()
        };
        
        console.log(`📊 Dados extraídos:`);
        console.log(JSON.stringify(propertyData, null, 2));
        console.log(`\n💾 Tentando salvar no Supabase...`);
        
        const { data, error } = await supabase.from('properties').upsert(propertyData, { onConflict: 'title' });

        if (error) {
            console.error(`\n❌ ERRO AO SALVAR:`);
            console.error(JSON.stringify(error, null, 2));
        } else {
            console.log(`\n✅ SUCESSO! Imóvel salvo.`);
            console.log(`Resposta:`, data);
        }
        
    } catch (e) {
        console.error(`\n❌ ERRO GERAL:`, e.message);
        console.error(e.stack);
    }
}

testOne();
