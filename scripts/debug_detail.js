import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

async function debug() {
    const url = 'https://www.fazendasbrasil.com.br/25/imoveis/venda-sitio-zona-rural-belo-horizonte-mg';
    console.log(`Fetching ${url}...`);
    try {
        const { data } = await axios.get(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        fs.writeFileSync('debug_detail.html', data);
        console.log('Saved to debug_detail.html');

        const $ = cheerio.load(data);
        const images = [];
        $('img').each((i, el) => {
             const src = $(el).attr('src');
             if (src) images.push(src);
        });
        console.log('All Images found:', images);
        
        // Test filter
        const filtered = images.filter(src => 
            (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png')) && 
            !src.includes('logo') && !src.includes('icon') && !src.includes('ssl')
        );
        console.log('Filtered Images:', filtered);

    } catch (e) {
        console.error('Error:', e.message);
    }
}

debug();
