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

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Erro: Credenciais do Supabase não encontradas no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BASE_URL = 'https://www.fazendasbrasil.com.br';
const TARGET_URL = 'https://www.fazendasbrasil.com.br/imobiliaria/imoveis/0/1';

async function importAll() {
    console.log(`🚀 Nova estratégia: extrair imagens da página de listagem\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    try {
        // 1. Buscar a página de listagem
        console.log(`📥 Baixando página de listagem...`);
        const { data: pageHtml } = await axios.get(TARGET_URL, {
             headers: { 
               'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
               'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
             }
        });
        
        const $ = cheerio.load(pageHtml);
        
        // 2. Extrair dados de cada card de propriedade
        const properties = [];
        $('[id^="property-"]').each((i, el) => {
            const $card = $(el);
            const id = $card.attr('id');
            
            if (id) {
                // Link
                const link = $card.find('a[href*="/imoveis/"]').first().attr('href');
                const fullUrl = link && (link.startsWith('http') ? link : `${BASE_URL}${link}`);
                
                // Imagens do carousel
                const images = [];
                $card.find('.carousel-item img').each((idx, img) => {
                    const src = $(img).attr('src');
                    if (src) {
                        const fullImg = src.startsWith('http') ? src : `${BASE_URL}${src}`;
                        if (!images.includes(fullImg)) images.push(fullImg);
                    }
                });
                
                
                // Descrição (resumo do card)
                const descriptionFull = $card.find('.c49-property-resume').text().trim() || '';
                
                // Preço - tentar do card primeiro, depois da descrição
                let price = 0;
                const priceText = $card.find('.c49-property-value').text().trim();
                let match = priceText.match(/R\$\s?([\d.,]+)/);
                
                // Se não encontrou no card, tentar na descrição
                if (!match && descriptionFull) {
                    match = descriptionFull.match(/R\$\s?([\d.,]+)/);
                }
                
                if (match) {
                    price = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
                }
                
                // Localização
                const locationText = $card.find('.text-muted').first().text().trim();
                let city = locationText || 'Importado';
                let state = 'BR';
                
                // Título - extrair da primeira linha da descrição (já que o h3 está vazio)
                let title = '';
                if (descriptionFull) {
                    const firstLine = descriptionFull.split('\n')[0].trim();
                    // Pegar até o primeiro emoji ou até 100 caracteres
                    title = firstLine.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim().slice(0, 100);
                }
                
                // Fallback se ainda não tiver título
                if (!title || title === '') {
                    title = $card.find('.card-title').text().trim();
                }
                if (!title || title === '') {
                    title = $card.find('h3').text().trim();
                }
                if (!title || title === '') {
                    // Usar localização como título
                    const locationText = $card.find('.text-muted').first().text().trim();
                    title = locationText ? `Propriedade em ${locationText}` : 'Propriedade Importada';
                }
                
                // Usar o resto como descrição
                const description = descriptionFull;
                
                // Área - extrair da descrição (card-footer não está disponível na listagem)
                let area = 0;
                const areaMatch = descriptionFull.match(/([\d.,]+)\s?(hectares|ha|alqueires|alq|m²|m2)/i);
                if (areaMatch) {
                   let val = parseFloat(areaMatch[1].replace(/\./g,'').replace(',','.'));
                   const unit = areaMatch[2].toLowerCase();
                   
                   // Converter para m²
                   if (unit.includes('alq')) {
                       val *= 48400; // 1 alqueire paulista = 48.400 m²
                   } else if (unit.includes('ha')) {
                       val *= 10000; // 1 hectare = 10.000 m²
                   }
                   // Se já está em m², não precisa converter
                   
                   area = val;
                }
                
                if (fullUrl) {
                    properties.push({
                        url: fullUrl,
                        title,
                        description,
                        price,
                        city,
                        state,
                        area,
                        images
                    });
                }
            }
        });

        console.log(`✅ Encontrados ${properties.length} imóveis\n`);
        
        // 3. Salvar cada imóvel
        for (let i = 0; i < properties.length; i++) {
            const prop = properties[i];
            console.log(`\n[${i + 1}/${properties.length}] ${prop.title}`);
            console.log(`   📸 Fotos: ${prop.images.length}`);
            console.log(`   📏 Área: ${prop.area} m²`);
            
            try {
                const propertyData = {
                    title: prop.title,
                    description: prop.description,
                    price: prop.price || 0,
                    type: 'Fazenda',
                    status: 'Disponível',
                    city: prop.city,
                    state: prop.state, 
                    features: { area: prop.area, bedrooms: 0, bathrooms: 0 },
                    images: prop.images.length > 0 ? prop.images : ['https://www.fazendasbrasil.com.br/img/logo-topo.png'],
                    highlighted: true,
                    created_at: new Date().toISOString()
                };
                
                const { error } = await supabase.from('properties').upsert(propertyData, { onConflict: 'title' });

                if (error) {
                    console.error(`   ❌ Erro: ${error.message}`);
                    errorCount++;
                } else {
                    console.log(`   ✅ Salvo!`);
                    successCount++;
                }
                
                await new Promise(r => setTimeout(r, 500));
                
            } catch (error) {
                console.error(`   ❌ Erro: ${error.message}`);
                errorCount++;
            }
        }
        
        console.log(`\n\n🎉 IMPORTAÇÃO CONCLUÍDA!`);
        console.log(`✅ Sucessos: ${successCount}`);
        console.log(`❌ Erros: ${errorCount}`);
        console.log(`📊 Total: ${properties.length}`);
        
    } catch (e) {
        console.error(`\n❌ Erro fatal:`, e.message);
        console.error(e.stack);
    }
}

importAll();
