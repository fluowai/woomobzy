import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Credenciais do Supabase não encontradas!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://okaimoveis.com.br';
const LIST_URL = 'https://okaimoveis.com.br/imoveis.php?para=vender';

// Utility to parse price
function parsePrice(text) {
    if (!text) return 0;
    const clean = text.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

// Utility to clean text
function cleanText(text) {
    return text ? text.replace(/\s+/g, ' ').trim() : '';
}

async function scrapePage(pageNumber) {
    const url = `${LIST_URL}&pagina=${pageNumber}`;
    console.log(`\n📄 Processando página ${pageNumber}: ${url}`);

    try {
        const { data: html } = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        // FIX: Site is UTF-8, do not force latin1
        const $ = cheerio.load(html.toString());

        const cards = $('.card.imovel');
        console.log(`   Encontrados ${cards.length} imóveis nesta página.`);

        if (cards.length === 0) return false; // Stop if no cards

        const promises = [];

        cards.each((i, el) => {
            const card = $(el);
            const linkTag = card.find('.card-header a').first();
            const relativeLink = linkTag.attr('href');
            
            if (!relativeLink) return;

            const fullUrl = relativeLink.startsWith('http') ? relativeLink : `${BASE_URL}/${relativeLink}`;
            const title = cleanText(linkTag.text());
            const cityState = cleanText(card.find('.cidade_uf').text());
            const code = cleanText(card.find('.codigo_tx b').text());
            const priceText = cleanText(card.find('.preco_imovel').text());
            const price = parsePrice(priceText);
            
            // Basic features from card
            const features = {
                bedrooms: 0,
                bathrooms: 0,
                garages: 0,
                area: 0
            };

            // Parse icons in card
            card.find('.imov_caract span').each((j, span) => {
                const text = $(span).text();
                const iconClass = $(span).find('i').attr('class') || '';
                
                if (iconClass.includes('bed') || text.includes('Quarto')) {
                    features.bedrooms = parseInt(text) || 0;
                } else if (iconClass.includes('shower') || text.includes('Banheiro')) {
                    features.bathrooms = parseInt(text) || 0;
                } else if (iconClass.includes('garage') || text.includes('Vaga')) {
                    features.garages = parseInt(text) || 0;
                } else if (iconClass.includes('expand') || text.includes('m²')) { // Sometimes area is in card
                    features.area = parseFloat(text.replace('m²', '').replace(',', '.')) || 0;
                }
            });

            // Parse Location
            let city = 'Desconhecida';
            let state = 'PR';
            if (cityState.includes('/')) {
                [city, state] = cityState.split('/').map(s => s.trim());
            } else {
                city = cityState;
            }

            promises.push(processDetail(fullUrl, {
                title,
                code,
                price,
                city,
                state,
                features
            }));
        });

        await Promise.all(promises);
        return true;

    } catch (e) {
        console.error(`❌ Erro na página ${pageNumber}:`, e.message);
        return false;
    }
}

async function processDetail(url, basicData) {
    try {
        console.log(`   🔍 Detalhando: ${basicData.title}`);
        const { data: html } = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        // FIX: Site is UTF-8
        const $ = cheerio.load(html.toString());

        const description = cleanText($('.descricao-imovel').text() || $('.texto_descricao').text() || $('.description').text());

        // Extract Images
        const images = [];
        // Look for gallery images. Pattern might vary.
        // Often in a slider or Lightbox
        $('a[data-fancybox="gallery"], a[data-lightbox="roadtrip"], .carousel-item img, .slide img').each((i, el) => {
             let src = $(el).attr('href') || $(el).attr('src');
             if (src && !src.includes('logo') && (src.endsWith('.jpg') || src.endsWith('.png') || src.endsWith('.jpeg'))) {
                 const full = src.startsWith('http') ? src : `${BASE_URL}/${src}`;
                 if (!images.includes(full)) images.push(full);
             }
        });
        
        // If empty, try finding all images in a specific container
        if (images.length === 0) {
             $('#slide-imovel img').each((i, el) => {
                 let src = $(el).attr('src');
                 if (src) {
                     const full = src.startsWith('http') ? src : `${BASE_URL}/${src}`;
                     if (!images.includes(full)) images.push(full);
                 }
             });
        }

        // Refine Area if not found in card
        if (basicData.features.area === 0) {
            // Try to find in details list
            // Example: <li>Area: 100m²</li>
             $('li, p, span').each((i, el) => {
                 const t = $(el).text();
                 if ((t.includes('Área') || t.includes('Area')) && t.includes('m²')) {
                      const match = t.match(/([\d,\.]+)\s?m²/);
                      if (match) {
                           basicData.features.area = parseFloat(match[1].replace('.', '').replace(',', '.'));
                      }
                 }
             });
        }

        const propertyData = {
            title: basicData.title,
            description: description || basicData.title,
            price: basicData.price,
            type: 'Residencial', // Default, maybe refine later
            status: 'Disponível',
            city: basicData.city,
            state: basicData.state,
            features: basicData.features,
            images: images.slice(0, 20), // Limit images
            highlighted: false,
            created_at: new Date().toISOString()
        };

        // Upsert
        const { error } = await supabase
            .from('properties')
            .upsert(propertyData, { onConflict: 'title' }); // Using title as key for now, ideally use a unique ID field if added to schema

        if (error) {
            console.error(`      ❌ Erro ao salvar "${basicData.title}":`, error.message);
        } else {
            console.log(`      ✅ Salvo: "${basicData.title}"`);
        }

    } catch (e) {
        console.error(`      ⚠️ Erro ao detalhar ${url}:`, e.message);
    }
}

async function run() {
    console.log('🚀 Iniciando migração Oka Imóveis...');
    
    // Process pages 1 to 5 (or more if needed)
    for (let i = 1; i <= 3; i++) {
        const hasMore = await scrapePage(i);
        if (!hasMore) break;
    }

    console.log('\n🏁 Migração concluída.');
}

run();
