import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://www.fazendasbrasil.com.br';
const START_PAGE = 'https://www.fazendasbrasil.com.br/imobiliaria/imoveis/0/1';

// Blocklist aprimorada
const IMAGE_BLOCKLIST = [
    'google', 'ssl', 'logo', 'icon', 'facebook', 'instagram', 
    'twitter', 'youtube', 'tiktok', 'whatsapp', 'semfoto', 
    'vazio', 'pixel', 'banner', 'ads', 'publicidade'
];

function isValidImageUrl(src) {
    if (!src) return false;
    const lower = src.toLowerCase();
    
    // Deve ter extensão de imagem válida
    if (!lower.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) return false;
    
    // Não pode conter palavras da blocklist
    if (IMAGE_BLOCKLIST.some(word => lower.includes(word))) return false;
    
    // Evitar imagens muito pequenas (thumbnails de UI)
    if (lower.includes('/mini/') && !lower.includes('/exportacao/')) return false;
    if (lower.includes('thumb') || lower.includes('icon')) return false;
    
    return true;
}

async function downloadImage(url) {
    try {
        const response = await axios.get(url, { 
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        return Buffer.from(response.data);
    } catch (error) {
        console.error(`      ❌ Erro ao baixar ${url}:`, error.message);
        return null;
    }
}

async function uploadToSupabase(buffer, propertyId, index) {
    const fileName = `${Date.now()}_${index}.jpg`;
    const filePath = `properties/${propertyId}/${fileName}`;
    
    const { data, error } = await supabase.storage
        .from('property-images')
        .upload(filePath, buffer, {
            contentType: 'image/jpeg',
            upsert: true
        });
    
    if (error) {
        console.error(`      ❌ Erro upload Supabase:`, error.message);
        return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);
    
    return publicUrl;
}

async function scrapePropertyDetails(url) {
    console.log(`\n   🔍 Acessando: ${url}`);
    
    try {
        const { data: html } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const $ = cheerio.load(html);
        
        // Título
        const title = $('h1').first().text().trim() || 'Fazenda sem Título';
        
        // Preço
        let price = 0;
        const priceText = $('.preco, .price, [class*="preco"]').first().text().trim();
        const priceMatch = priceText.match(/[\d.,]+/);
        if (priceMatch) {
            price = parseFloat(priceMatch[0].replace(/\./g, '').replace(',', '.'));
        }
        
        // Localização
        const locationText = $('.localizacao, .location, [class*="local"]').text();
        let city = '', state = '';
        const locMatch = locationText.match(/([^,]+),\s*([A-Z]{2})/);
        if (locMatch) {
            city = locMatch[1].trim();
            state = locMatch[2].trim();
        }
        
        // Descrição
        const description = $('.descricao, .description, [class*="desc"]').first().text().trim() || '';
        
        // Área
        let areaHectares = 0;
        const areaText = $('body').text();
        const areaMatch = areaText.match(/(\d+[\.,]?\d*)\s*(ha|hectare|alqueire)/i);
        if (areaMatch) {
            let val = parseFloat(areaMatch[1].replace(',', '.'));
            const unit = areaMatch[2].toLowerCase();
            if (unit.includes('alq')) val = val * 4.84;
            areaHectares = val;
        }
        
        // EXTRAÇÃO COMPLETA DE IMAGENS
        const imageUrls = new Set();
        
        // 1. Prioridade máxima: data-foto (imagens em alta resolução)
        $('[data-foto]').each((i, el) => {
            const src = $(el).attr('data-foto');
            if (isValidImageUrl(src)) {
                const fullUrl = src.startsWith('http') ? src : `${BASE_URL}${src}`;
                imageUrls.add(fullUrl);
            }
        });
        
        // 2. Galeria de imagens (se houver)
        $('.galeria img, .gallery img, [class*="galeria"] img, [class*="gallery"] img').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (isValidImageUrl(src)) {
                const fullUrl = src.startsWith('http') ? src : `${BASE_URL}${src}`;
                imageUrls.add(fullUrl);
            }
        });
        
        // 3. Todas as imagens da página (filtradas)
        $('img').each((i, el) => {
            const src = $(el).attr('src');
            if (isValidImageUrl(src)) {
                const fullUrl = src.startsWith('http') ? src : `${BASE_URL}${src}`;
                // Priorizar imagens de /exportacao/ e /fotos/
                if (fullUrl.includes('/exportacao/') || fullUrl.includes('/fotos/') || fullUrl.includes('/imovel/')) {
                    imageUrls.add(fullUrl);
                }
            }
        });
        
        const images = Array.from(imageUrls);
        console.log(`      📸 Encontradas ${images.length} imagens válidas`);
        
        return {
            title,
            price,
            city,
            state,
            description,
            areaHectares,
            images
        };
        
    } catch (error) {
        console.error(`      ❌ Erro ao extrair dados:`, error.message);
        return null;
    }
}

async function migrateAllProperties() {
    console.log('🚀 MIGRAÇÃO COMPLETA - FAZENDAS BRASIL\n');
    console.log('═'.repeat(60));
    
    // 1. Limpar banco de dados (dependências primeiro)
    console.log('\n🧹 LIMPANDO BANCO DE DADOS...');
    
    // Limpar leads primeiro (foreign key)
    const { error: leadsError } = await supabase
        .from('crm_leads')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (leadsError) console.log('   ⚠️ Aviso ao limpar leads:', leadsError.message);
    
    // Limpar favoritos se existir
    const { error: favsError } = await supabase
        .from('favorites')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (favsError) console.log('   ⚠️ Aviso ao limpar favoritos:', favsError.message);
    
    // Agora limpar propriedades
    const { error: clearError } = await supabase
        .from('properties')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (clearError) {
        console.error('❌ Erro ao limpar:', clearError);
        return;
    }
    console.log('✅ Banco limpo!\n');
    
    // 2. Buscar lista de imóveis
    console.log('📋 BUSCANDO LISTA DE IMÓVEIS...');
    const { data: listHtml } = await axios.get(START_PAGE);
    const $ = cheerio.load(listHtml);
    
    const propertyLinks = [];
    $('a[href*="/imoveis/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.match(/\/\d+\/imoveis\//)) {
            const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
            if (!propertyLinks.includes(fullUrl)) {
                propertyLinks.push(fullUrl);
            }
        }
    });
    
    console.log(`✅ Encontrados ${propertyLinks.length} imóveis\n`);
    console.log('═'.repeat(60));
    
    // 3. Processar cada imóvel
    let successCount = 0;
    
    for (let i = 0; i < propertyLinks.length; i++) {
        const link = propertyLinks[i];
        console.log(`\n[${i + 1}/${propertyLinks.length}] 🏡 Processando imóvel...`);
        
        // Extrair dados
        const propertyData = await scrapePropertyDetails(link);
        if (!propertyData) {
            console.log('   ⚠️ Pulando (erro na extração)');
            continue;
        }
        
        // Filtrar títulos problemáticos
        if (propertyData.title.includes('Compensação de Reserva Legal')) {
            console.log('   🚫 Ignorando imóvel problemático (Reserva Legal)');
            continue;
        }
        
        // Criar registro inicial
        const { data: newProperty, error: insertError } = await supabase
            .from('properties')
            .insert({
                title: propertyData.title,
                price: propertyData.price,
                description: propertyData.description,
                city: propertyData.city,
                state: propertyData.state,
                type: 'Fazenda',
                status: 'Disponível',
                features: { areaHectares: propertyData.areaHectares },
                images: []
            })
            .select()
            .single();
        
        if (insertError) {
            console.error('   ❌ Erro ao criar registro:', insertError.message);
            continue;
        }
        
        console.log(`   ✅ Registro criado: ${propertyData.title}`);
        
        // Download e upload de TODAS as imagens
        const uploadedUrls = [];
        console.log(`   📥 Baixando ${propertyData.images.length} imagens...`);
        
        for (let j = 0; j < propertyData.images.length; j++) {
            const imageUrl = propertyData.images[j];
            console.log(`      [${j + 1}/${propertyData.images.length}] Processando...`);
            
            const buffer = await downloadImage(imageUrl);
            if (!buffer) continue;
            
            const publicUrl = await uploadToSupabase(buffer, newProperty.id, j);
            if (publicUrl) {
                uploadedUrls.push(publicUrl);
                console.log(`      ✅ Upload OK`);
            }
        }
        
        // Atualizar com URLs do Supabase
        if (uploadedUrls.length > 0) {
            await supabase
                .from('properties')
                .update({ images: uploadedUrls })
                .eq('id', newProperty.id);
            
            console.log(`   🎉 ${uploadedUrls.length} fotos salvas no Supabase!`);
            successCount++;
        } else {
            console.log(`   ⚠️ Nenhuma foto foi salva`);
        }
        
        // Delay para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log(`\n🏁 MIGRAÇÃO CONCLUÍDA!`);
    console.log(`   ✅ ${successCount} imóveis migrados com sucesso`);
    console.log(`   📊 Total processado: ${propertyLinks.length}`);
}

migrateAllProperties().catch(console.error);
