import puppeteer from 'puppeteer';

async function checkPuppeteer() {
  const browser = await puppeteer.launch({ headless: 'new' });
  
  const urls = [
    'https://pamasimoveis.com.br/imovel/locacao/casas/vinhedo/terras-de-vinhedo-condominio-terras-de-vinhedo/5314',
    'https://pamasimoveis.com.br/imovel/venda/casas/vinhedo/recanto-das-canjaranas/40',
    'https://pamasimoveis.com.br/imovel/venda/apartamentos/vinhedo/santa-claudina-bela-vista/5075',
  ];
  
  for (const url of urls) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    const title = await page.title();
    const h1 = await page.$eval('h1', el => el.innerText).catch(() => 'NO H1');
    
    const images = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img'))
        .map(img => img.src)
        .filter(src => src && src.includes('s3.amazonaws.com'));
    });
    
    console.log(`\nURL: ${url}`);
    console.log(`Title: ${title}`);
    console.log(`H1: ${h1}`);
    console.log(`S3 Images: ${images.length}`);
    images.slice(0, 5).forEach(img => console.log(`  ${img}`));
    
    await page.close();
  }
  
  await browser.close();
}

checkPuppeteer().catch(console.error);
