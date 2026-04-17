import axios from 'axios';
import * as cheerio from 'cheerio';

const url = 'https://www.fazendasbrasil.com.br/25/imoveis/venda-sitio-zona-rural-belo-horizonte-mg';
const BASE_URL = 'https://www.fazendasbrasil.com.br';

async function debugImages() {
    const { data: html } = await axios.get(url, {
         headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $page = cheerio.load(html);

    console.log('🔍 Testando extração de imagens...\n');
    
    const images = [];
    let totalImgs = 0;
    let adminImgs = 0;
    
    $page('img').each((i, el) => {
        totalImgs++;
        const src = $page(el).attr('src');
        console.log(`${i + 1}. src="${src}"`);
        
        if (src && src.includes('admin/imovel')) {
            adminImgs++;
            const full = src.startsWith('http') ? src : `${BASE_URL}${src}`;
            console.log(`   ✅ MATCH! Full URL: ${full}`);
            if (!images.includes(full)) images.push(full);
        }
    });
    
    console.log(`\n📊 Resumo:`);
    console.log(`Total de <img>: ${totalImgs}`);
    console.log(`Com admin/imovel: ${adminImgs}`);
    console.log(`Array final: ${images.length} imagens`);
    console.log(`\nImagens:`);
    images.forEach((img, i) => console.log(`  ${i + 1}. ${img}`));
}

debugImages();
