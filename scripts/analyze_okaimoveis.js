import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

const URL = 'https://okaimoveis.com.br/imoveis.php?para=vender';
const BASE_URL = 'https://okaimoveis.com.br';

async function analyze() {
    try {
        console.log(`Fetching ${URL}...`);
        const { data } = await axios.get(URL, {
            responseType: 'arraybuffer', // Handle encoding manually if needed
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' 
            }
        });
        
        const html = data.toString('latin1'); // Try latin1 as many old PHP sites use it
        fs.writeFileSync('debug_okaimoveis.html', html);
        console.log('Saved debug_okaimoveis.html');

        const $ = cheerio.load(html);
        
        // Find links
        const links = [];
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if(href && href.includes('imovel.php?ref=')) {
                links.push(href);
            }
        });

        console.log(`Found ${links.length} property links (pattern: imovel.php?ref=).`);
        if(links.length > 0) {
             const firstLink = links[0].startsWith('http') ? links[0] : `${BASE_URL}/${links[0]}`;
             console.log(`Analyzing first link: ${firstLink}`);
             
             const { data: propData } = await axios.get(firstLink, { responseType: 'arraybuffer' });
             const propHtml = propData.toString('latin1');
             fs.writeFileSync('debug_okaimoveis_prop.html', propHtml);
             console.log('Saved debug_okaimoveis_prop.html');
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

analyze();
