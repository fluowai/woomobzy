import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

async function checkPropertyImages(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 15000
  });
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  const images = new Set();
  
  $('img').each((i, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && src.includes('s3.amazonaws.com')) {
      images.add(src);
    }
  });
  
  const scripts = $('script').text();
  const s3Matches = scripts.match(/https:\/\/s3\.amazonaws\.com\/[^\s"']+/g) || [];
  s3Matches.forEach(img => images.add(img));
  
  console.log(`URL: ${url}`);
  console.log(`Title: ${$('h1').first().text().trim() || $('meta[property="og:title"]').attr('content') || ''}`);
  console.log(`Images found: ${images.size}`);
  
  return Array.from(images).slice(0, 5);
}

async function main() {
  const urls = [
    'https://pamasimoveis.com.br/imovel/locacao/casas/vinhedo/terras-de-vinhedo-condominio-terras-de-vinhedo/5314',
    'https://pamasimoveis.com.br/imovel/venda/apartamentos/vinhedo/nova-vinhedo-spazio-reale-condominium-spazio-reale/5314',
  ];
  
  for (const url of urls) {
    const imgs = await checkPropertyImages(url);
    imgs.forEach(img => console.log(' ', img));
    console.log('');
  }
}

main().catch(console.error);
