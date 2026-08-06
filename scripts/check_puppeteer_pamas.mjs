import puppeteer from 'puppeteer';

async function checkPuppeteer() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.goto(
    'https://pamasimoveis.com.br/imovel/locacao/casas/vinhedo/terras-de-vinhedo-condominio-terras-de-vinhedo/5314',
    {
      waitUntil: 'networkidle2',
      timeout: 60000,
    }
  );

  const title = await page.title();
  const h1 = await page.$eval('h1', (el) => el.innerText).catch(() => 'NO H1');
  const ogTitle = await page
    .$eval('meta[property="og:title"]', (el) => el.getAttribute('content'))
    .catch(() => 'NO OG');

  const images = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .map((img) => img.src)
      .filter((src) => src && src.includes('s3.amazonaws.com'));
  });

  console.log('Title:', title);
  console.log('H1:', h1);
  console.log('OG Title:', ogTitle);
  console.log('S3 Images:', images.length);
  images.slice(0, 5).forEach((img) => console.log(' ', img));

  await browser.close();
}

checkPuppeteer().catch(console.error);
