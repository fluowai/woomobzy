import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const megaInvestimentosId = '52757ffb-dd3a-4106-8783-31ebe01a1455'; // Mega Investimentos
const BASE_URL = 'https://megainvestimoveis.com.br';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function fetchPage(url) {
  try {
    const response = await fetch(url);
    return await response.text();
  } catch (err) {
    console.error(`Error fetching ${url}:`, err);
    return null;
  }
}

async function scrapePropertyDetails(url) {
  console.log(`Scraping: ${url}`);
  const html = await fetchPage(url);
  if (!html) return null;
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();
  let priceText = $('.imovel-preco, .price, .val').first().text().trim();
  if (!priceText) {
    priceText = $('h2:contains("R$"), h3:contains("R$")').first().text().trim();
  }
  const priceMatch = priceText
    .replace(/\./g, '')
    .replace(',', '.')
    .match(/[\d\.]+/);
  const price = priceMatch ? parseFloat(priceMatch[0]) : null;

  const description =
    $('.imovel-descricao, .descricao, #descricao').text().trim() || title;

  // Photos
  const images = [];
  $('.imovel-galeria img, .carousel img, .swiper-slide img').each((i, el) => {
    let src = $(el).attr('src') || $(el).attr('data-src');
    if (src) {
      if (src.startsWith('/')) src = BASE_URL + src;
      images.push(src);
    }
  });

  // Check if there are other images
  if (images.length === 0) {
    $('img').each((i, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src');
      if (
        src &&
        (src.includes('imovel') ||
          src.includes('imoveis') ||
          src.includes('fotos'))
      ) {
        if (src.startsWith('/')) src = BASE_URL + src;
        images.push(src);
      }
    });
  }

  return {
    title: title || 'Imóvel sem título',
    description,
    price,
    images: [...new Set(images)], // unique
    url,
  };
}

async function run() {
  await client.connect();

  const pagesToScrape = [`${BASE_URL}/venda`, `${BASE_URL}/aluguel`];

  const propertyLinks = new Set();

  for (const pageUrl of pagesToScrape) {
    console.log(`Scraping list page: ${pageUrl}`);
    const html = await fetchPage(pageUrl);
    if (!html) continue;
    const $ = cheerio.load(html);

    $('a[href*="/imovel/"]').each((i, el) => {
      let link = $(el).attr('href');
      if (link.startsWith('/')) link = BASE_URL + link;
      propertyLinks.add(link);
    });
  }

  console.log(
    `Found ${propertyLinks.size} unique properties. Scraping details...`
  );

  for (const link of propertyLinks) {
    const details = await scrapePropertyDetails(link);
    if (details && details.title) {
      const purpose = link.includes('aluguel') ? 'Aluguel' : 'Venda';

      // Insert into DB
      try {
        await client.query(
          `
                    INSERT INTO properties (
                        organization_id, title, description, price, purpose, images, external_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT DO NOTHING
                `,
          [
            megaInvestimentosId,
            details.title,
            details.description,
            details.price,
            purpose,
            details.images,
            link, // using link as external_id temporarily to avoid duplicates
          ]
        );
        console.log(`Saved: ${details.title}`);
      } catch (err) {
        console.error(`Error saving ${details.title}:`, err.message);
      }
    }
    // sleep a bit
    await new Promise((r) => setTimeout(r, 500));
  }

  await client.end();
  console.log('Migration completed.');
}

run();
