import axios from 'axios';
import * as cheerio from 'cheerio';

const TARGET_URL = 'https://www.fazendasbrasil.com.br/imobiliaria/imoveis/0/1';
const BASE_URL = 'https://www.fazendasbrasil.com.br';

async function test() {
    console.log(`🚀 Testando scraper em: ${TARGET_URL}\n`);
    
    try {
        const { data: pageHtml } = await axios.get(TARGET_URL, {
             headers: { 
               'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
               'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
             }
        });
        
        console.log(`✅ HTML baixado: ${pageHtml.length} caracteres\n`);
        
        const $ = cheerio.load(pageHtml);
        
        const propertyLinks = [];
        
        // Procurar pelos cards de propriedade
        $('[id^="property-"]').each((i, el) => {
            const id = $(el).attr('id');
            if (id) {
                const propertyId = id.replace('property-', '');
                const link = $(el).find('a[href*="/imoveis/"]').first().attr('href');
                if (link) {
                    const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
                    console.log(`✅ Imóvel #${propertyId}: ${fullUrl}`);
                    propertyLinks.push(fullUrl);
                }
            }
        });

        console.log(`\n📊 RESULTADO: ${propertyLinks.length} imóveis encontrados`);
        
        if (propertyLinks.length === 0) {
            console.log('\n⚠️  Nenhum imóvel encontrado. Tentando método alternativo...\n');
            
            // Método alternativo: procurar todos os links com /imoveis/
            $('a').each((i, el) => {
                const link = $(el).attr('href');
                if (link && /\/\d+\/imoveis\//.test(link)) {
                    const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
                    if (!propertyLinks.includes(fullUrl)) {
                        console.log(`✅ Link encontrado: ${fullUrl}`);
                        propertyLinks.push(fullUrl);
                    }
                }
            });
            
            console.log(`\n📊 RESULTADO ALTERNATIVO: ${propertyLinks.length} imóveis`);
        }
        
    } catch (e) {
        console.error("❌ Erro:", e.message);
    }
}

test();
