import puppeteer from 'puppeteer';

async function checkPuppeteer() {
  const browser = await puppeteer.launch({ headless: 'new' });

  const url =
    'https://pamasimoveis.com.br/imovel/locacao/casas/vinhedo/terras-de-vinhedo-condominio-terras-de-vinhedo/5314';
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  // Get all images after page fully loads
  const allImages = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .map((img) => ({
        src: img.src,
        alt: img.alt,
        width: img.width,
        height: img.height,
      }))
      .filter((img) => img.src && img.width > 0 && img.height > 0);
  });

  console.log('All loaded images:', allImages.length);
  allImages.forEach((img) => {
    console.log(`  ${img.src.substring(0, 100)} (${img.width}x${img.height})`);
  });

  // Check for JSON-LD or structured data
  const jsonLd = await page.evaluate(() => {
    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]'
    );
    return Array.from(scripts).map((s) => s.textContent);
  });

  console.log('\nJSON-LD:', jsonLd.length);
  jsonLd.forEach((data) => {
    console.log('  ', data.substring(0, 200));
  });

  // Check for inline data
  const inlineData = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script');
    return Array.from(scripts)
      .map((s) => s.textContent)
      .filter(
        (text) =>
          text.includes('image') ||
          text.includes('foto') ||
          text.includes('galeria')
      )
      .map((text) => text.substring(0, 300));
  });

  console.log('\nInline data with images:', inlineData.length);
  inlineData.slice(0, 3).forEach((data) => {
    console.log('  ', data);
  });

  await browser.close();
}

checkPuppeteer().catch(console.error);
