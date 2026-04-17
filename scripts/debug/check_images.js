import axios from 'axios';
import * as cheerio from 'cheerio';

const url = 'https://www.fazendasbrasil.com.br/25/imoveis/venda-sitio-zona-rural-belo-horizonte-mg';
const BASE_URL = 'https://www.fazendasbrasil.com.br';

async function checkImages() {
    const { data: html } = await axios.get(url, {
         headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(html);

    console.log('🔍 Procurando imagens...\n');
    
    // Método 1: Todas as imagens
    console.log('📸 TODAS as imagens encontradas:');
    $('img').each((i, el) => {
        const src = $(el).attr('src');
        console.log(`  ${i + 1}. ${src}`);
    });
    
    // Método 2: Imagens dentro do carousel
    console.log('\n📸 Imagens no CAROUSEL:');
    $('.carousel-item img').each((i, el) => {
        const src = $(el).attr('src');
        console.log(`  ${i + 1}. ${src}`);
    });
    
    // Método 3: Imagens com src contendo 'admin/imovel'
    console.log('\n📸 Imagens de IMÓVEIS (admin/imovel):');
    $('img').each((i, el) => {
        const src = $(el).attr('src');
        if (src && src.includes('admin/imovel')) {
            const full = src.startsWith('http') ? src : `${BASE_URL}${src}`;
            console.log(`  ✅ ${full}`);
        }
    });
}

checkImages();
