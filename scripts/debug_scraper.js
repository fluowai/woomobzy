import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

async function debug() {
    const url = 'https://www.fazendasbrasil.com.br/imobiliaria/imoveis/0/1';
    console.log(`Fetching ${url}...`);
    try {
        const { data } = await axios.get(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });
        
        console.log('Status: 200 OK');
        console.log('Length:', data.length);
        
        fs.writeFileSync('debug_page.html', data);
        console.log('Saved to debug_page.html');

        const $ = cheerio.load(data);
        const links = [];
        $('a').each((i, el) => {
             const href = $(el).attr('href');
             if (href && href.includes('/imobiliaria/imovel/')) links.push(href);
        });
        console.log('Links found:', links);

    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Data:', e.response.data);
        }
    }
}

debug();
