import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const BASE_URL = 'https://www.fazendasbrasil.com.br';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { startUrl } = req.body;
    if (!startUrl) return res.status(400).json({ error: 'URL é obrigatória' });

    console.log(`🚀 Recebida solicitação de migração para: ${startUrl}`);
    
    // Na Vercel, functions têm timeout (10s default, max 60s Pro).
    // Scraping longo pode dar timeout. O ideal seria usar background jobs (QStash, Inngest).
    // Para agora, vamos tentar processar o que der ou iniciar/retornar.
    // Como era local antes, rodava indefinidamente. Aqui vamos simplificar.
    
    // Responde imediatamente? Vercel Functions matam processo ao responder se não usar `waitUntil` (Edge) ou background.
    // Vamos tentar rodar e responder no final se for rápido, ou limitar o scope.
    // Ou simplesmente rodar assincronamente e torcer para dar tempo (não recomendado, mas legacy migration).
    
    // Mudança de estratégia: Responder que iniciou e tentar rodar (risco de ser morto)
    // Ou rodar um batch pequeno. 
    
    // Vamos manter a lógica original mas conscientes do limite.
    try {
        await runScraper(startUrl);
        res.json({ message: 'Migração processada (lote)', status: 'finished' });
    } catch (error) {
        console.error("❌ Erro no processo de scraper:", error);
        res.status(500).json({ error: error.message });
    }
}

async function runScraper(targetUrl) {
    // Mesma lógica do scraper reduzida/adaptada
    const { data: pageHtml } = await axios.get(targetUrl, {
            headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
    });

    const $ = cheerio.load(pageHtml);
    const propertyLinks = [];
    
    $('[id^="property-"]').each((i, el) => {
        const link = $(el).find('a[href*="/imoveis/"]').first().attr('href');
        if (link) {
            const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
            if (!propertyLinks.includes(fullUrl)) propertyLinks.push(fullUrl);
        }
    });

    // Limitar batch para não estourar timeout da Vercel
    const linksToProcess = propertyLinks.slice(0, 3); 

    for (const link of linksToProcess) {
        try {
            const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
            await processProperty(fullUrl);
        } catch (error) {
            console.error(`Erro ao processar ${link}:`, error.message);
        }
    }
}

async function processProperty(url) {
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
    if (priceText) {
            price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
    }

    const description = $('.descricao-imovel').text().trim() || $('.description').text().trim() || $('p').text().slice(0, 300);
    
    let area = 0;
    const areaMatch = bodyText.match(/([\d.,]+)\s?(hectares|ha|alqueires)/i);
    if (areaMatch) {
        let val = parseFloat(areaMatch[1].replace('.','').replace(',','.'));
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
        images,
        features: { area },
        created_at: new Date().toISOString()
    };
    
    await supabase.from('properties').upsert(propertyData, { onConflict: 'title' });
}
