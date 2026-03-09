import dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

dotenv.config();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Erro: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY) precisam estar no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://www.fazendasbrasil.com.br';
// URL base para listagem. O site pagina assim: /imobiliaria/imoveis/0/1, /imobiliaria/imoveis/0/2, etc.
const LISTING_URL_TEMPLATE = 'https://www.fazendasbrasil.com.br/imobiliaria/imoveis/0/';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para upload de imagem (retornada do migrate_images_robust.js adaptada)
async function uploadImageToSupabase(imgUrl, propertyId) {
    try {
        console.log(`      ⬇️ Baixando imagem: ${imgUrl}`);
        const { data, headers } = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 10000 });
        
        // Determinar extensão
        let ext = path.extname(imgUrl) || '.jpg';
        if (ext.includes('?')) ext = ext.split('?')[0];
        if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext.toLowerCase())) ext = '.jpg';
        
        const timestamp = Date.now();
        const rand = Math.floor(Math.random() * 1000);
        // Estrutura: property_id/timestamp_rand.jpg
        const filename = `${propertyId}/${timestamp}_${rand}${ext}`;

        const contentType = headers['content-type'] || 'image/jpeg';

        const { error: upErr } = await supabase.storage
            .from('properties')
            .upload(filename, data, { 
                contentType: contentType, 
                upsert: true 
            });

        if (upErr) {
            console.error(`      ❌ Erro upload Supabase: ${upErr.message}`);
            return null;
        }

        const { data: pubData } = supabase.storage.from('properties').getPublicUrl(filename);
        return pubData.publicUrl;

    } catch (err) {
        console.warn(`      ⚠️ Falha ao baixar/enviar imagem ${imgUrl}: ${err.message}`);
        return null;
    }
}

async function processProperty(url) {
    console.log(`\n   🚜 Processando imóvel: ${url}`);
    
    try {
        const { data: html } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
            timeout: 15000
        });
        const $ = cheerio.load(html);

        // --- Extração de Dados ---
        const title = $('h1').text().trim() || 'Fazenda sem Título';
        
        // Blocklist de Títulos Problemáticos (Google/Ads)
        if (title.includes('Compensação de Reserva Legal')) {
            console.log(`      🚫 Ignorando imóvel problemático: ${title}`);
            return;
        }
        
        // Verifica se já existe para evitar re-fazer tudo se rodar de novo (opcional, mas bom pra testes)
        // OBS: Vamos continuar para garantir que atualize imagens
        
        const bodyText = $('body').text();
        
        // Preço
        let price = 0;
        let priceText = $('.valor').text().trim() || $('.price').text().trim();
        if (!priceText) {
            const match = bodyText.match(/R\$\s?[\d.,]+/);
            if (match) priceText = match[0];
        }
        if (priceText) {
            const clean = priceText.replace(/[^\d,]/g, '').replace(',', '.');
            price = parseFloat(clean) || 0;
        }

        // Descrição
        const description = $('.descricao-imovel').text().trim() || $('.description').text().trim() || $('p').first().text().trim().substring(0, 500);

        // Localização
        let city = 'Não informada';
        let state = 'BR';
        const locationMatch = title.match(/em\s([\w\s]+)\s?-\s?([A-Z]{2})/);
        if (locationMatch) {
            city = locationMatch[1].trim();
            state = locationMatch[2].trim();
        }

        // Área
        let area = 0;
        const areaMatch = bodyText.match(/([\d.,]+)\s?(hectares|ha|alqueires)/i);
        if (areaMatch) {
            let val = parseFloat(areaMatch[1].replace('.', '').replace(',', '.'));
            const unit = areaMatch[2].toLowerCase();
            if (unit.includes('alq')) val = val * 4.84; // Alqueire para Hectare (aprox) -> ou manter a unidade original? O sistema parece usar número puro. Vamos assumir conversão simples ou bruta.
            // Se o sistema espera 'area' como número, geralmente é m² ou ha. Vamos manter o valor numérico cru se for Ha, ou converter.
            // Vou salvar o valor cru extraído por enquanto se for Ha.
             area = val;
        }

        // Imagens Originais
        const originalImages = [];
        
        const BLOCKLIST = ['google', 'ssl', 'logo', 'icon', 'facebook', 'instagram', 'twitter', 'youtube', 'tiktok', 'whatsapp', 'semfoto', 'vazio', 'pixel'];
        const ALLOWED_PATHS = ['/fotos/', '/imovel/', '/exportacao/'];

        function isValidImage(src) {
            if (!src) return false;
            const lower = src.toLowerCase();
            // Extensão válida
            if (!lower.includes('.jpg') && !lower.includes('.jpeg') && !lower.includes('.png') && !lower.includes('.webp')) return false;
            // Blocklist keywords
            if (BLOCKLIST.some(word => lower.includes(word))) return false;
            // Path Validation (Try to ensure it's a property photo)
            // if (!ALLOWED_PATHS.some(path => lower.includes(path))) return false; 
            // Relaxed path check for now, but block strict gallery/img without property indicators
            if (lower.includes('/gallery/') || lower.includes('/assets/')) return false;
            
            return true;
        }
        
        // Prioridade: data-foto
        $('[data-foto]').each((i, el) => {
            const src = $(el).attr('data-foto');
            if (isValidImage(src)) {
                 const full = src.startsWith('http') ? src : `${BASE_URL}${src}`;
                 if (!originalImages.includes(full)) originalImages.push(full);
            }
        });

        // Fallback: img src
        $('img').each((i, el) => {
            let src = $(el).attr('src');
            if (isValidImage(src)) {
                const full = src.startsWith('http') ? src : `${BASE_URL}${src}`;
                
                // Avoid mini if we already have the full version
                if (full.includes('/mini/')) {
                     if (originalImages.length === 0) {
                         // Only accept mini if we have NO other images
                         originalImages.push(full);
                     }
                } else {
                     if (!originalImages.includes(full)) originalImages.push(full);
                }
            }
        });

        console.log(`      📸 Encontradas ${originalImages.length} imagens originais (Filtradas).`);

        // Force Clear Images if we found new valid ones (to remove Google/Trash)
        // If we found 0 valid images, we probably shouldn't clear existing ones unless we are sure they are junk.
        // But for this recovery, we want to clear junk.
        if (originalImages.length === 0) {
             console.log("      ⚠️ Nenhuma imagem válida encontrada após filtro estrito.");
        }

        // --- Save Initial Record (to get ID) ---
        const dbPayload = {
            title: title,
            description: description,
            price: price,
            type: 'Fazenda', 
            status: 'Disponível',
            city: city,
            state: state,
            address: `${city} - ${state}`, 
            features: {
                area: area,
                bedrooms: 0,
                bathrooms: 0,
                garages: 0
            },
            // images: [] // Começa vazio ou com as originais temporariamente? Vamos por vazio e preencher depois
            highlighted: true 
        };

        // Upsert com retorno
        const { data: savedProps, error: upsertErr } = await supabase
            .from('properties')
            .upsert(dbPayload, { onConflict: 'title' })
            .select();

        if (upsertErr) {
            console.error(`      ❌ Erro ao salvar imóvel inicial: ${upsertErr.message}`);
            return;
        }

        const propertyId = savedProps[0].id;
        const currentImages = savedProps[0].images || [];

        // Check if images are already migrated (simple check: includes supabase url)
        const isMigrated = currentImages.some(img => img.includes('supabase.co'));
        
        let finalImages = [];

        // if (isMigrated && currentImages.length > 0) {
        //     console.log(`      ⏩ Imagens já parecem migradas para este imóvel (ID: ${propertyId}). Pulando upload.`);
        //     finalImages = currentImages;
        // } else {
             // --- Process Images ---
             // Limit to 15 images to avoid timeout/space, force re-upload
             const imagesToProcess = originalImages.slice(0, 15);
             
             for (const imgUrl of imagesToProcess) {
                 const publicUrl = await uploadImageToSupabase(imgUrl, propertyId);
                 if (publicUrl) {
                     finalImages.push(publicUrl);
                 }
                 await sleep(200); // Throttling
             }

             // Update with new images
             if (finalImages.length > 0) {
                 const { error: updateErr } = await supabase
                     .from('properties')
                     .update({ images: finalImages })
                     .eq('id', propertyId);
                 
                 if (updateErr) console.error(`      ❌ Erro ao atualizar imagens finais: ${updateErr.message}`);
                 else console.log(`      ✅ Imagens atualizadas com sucesso! (${finalImages.length})`);
             }
        // }

    } catch (err) {
        console.error(`   ❌ Erro ao processar URL ${url}:`, err.message);
    }
}

async function runMigration() {
    console.log("🚀 Iniciando Migração V2 - Fazendas Brasil (Com Imagens Supabase)");
    
    // Loop Pagination
    let page = 1;
    let keepGoing = true;
    const maxPages = 10; // Safety limit for now

    while (keepGoing && page <= maxPages) {
        const url = `${LISTING_URL_TEMPLATE}${page}`;
        console.log(`\n📄 Lendo Página ${page}: ${url}`);

        try {
            const { data: pageHtml } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
            });
            const $ = cheerio.load(pageHtml);
            
            const propertyLinks = [];
            $('a').each((i, el) => {
                const link = $(el).attr('href');
                // Nova estrutura: https://www.fazendasbrasil.com.br/25/imoveis/venda-sitio...
                // Antiga esperada: /imobiliaria/imovel/
                // Filtro: ter /imoveis/ e NÃO ter /imobiliaria/ (que é listagem)
                if (link && link.includes('/imoveis/') && !link.includes('/imobiliaria/') && !propertyLinks.includes(link)) {
                    if (!propertyLinks.some(l => l === link)) {
                        propertyLinks.push(link);
                    }
                }
            });

            if (propertyLinks.length === 0) {
                console.log("⚠️ Nenhum link encontrado nesta página. Encerrando.");
                keepGoing = false;
                break;
            }

            console.log(`🔍 Encontrados ${propertyLinks.length} imóveis na página.`);

            for (const link of propertyLinks) {
                const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
                await processProperty(fullUrl);
                // await sleep(1000); // Intervalo entre imóveis
            }

            page++;
            await sleep(2000); // Intervalo entre páginas

        } catch (err) {
            console.error(`❌ Erro fatal na página ${page}:`, err.message);
            keepGoing = false;
        }
    }

    console.log("\n🏁 Importação Finalizada!");
}

runMigration();
