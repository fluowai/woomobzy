import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// MinIO client
import * as Minio from 'minio';
const minioEndpoint = (process.env.MINIO_ENDPOINT || '').replace(
  /^https?:\/\//,
  ''
);
const minioBucket = process.env.MINIO_MEDIA_BUCKET || 'imobfluow';
const minioClient = new Minio.Client({
  endPoint: minioEndpoint,
  port: 443,
  useSSL: true,
  accessKey: (process.env.MINIO_ACCESS_KEY || '').replace(/['"]/g, ''),
  secretKey: (process.env.MINIO_SECRET_KEY || '').replace(/['"]/g, ''),
  pathStyle: true,
});

async function runMigration() {
  try {
    console.log('1. Buscando revenda Delazari Imóveis...');
    const { data: reseller, error: resellerError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', 'e2403fc5-fabd-4715-a6e6-eae5d0603106')
      .single();

    if (resellerError || !reseller) {
      console.log(resellerError);
      throw new Error(
        'Revenda Delazari Imóveis não encontrada. Certifique-se de que ela existe.'
      );
    }

    console.log(`Revenda encontrada: ${reseller.name} (${reseller.id})`);

    console.log('2. Verificando/Criando a organização Pamas Imóveis...');
    let { data: pamas, error: _pamasError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'pamasimoveis')
      .single();

    if (!pamas) {
      console.log('Organização pamasimoveis não existe. Criando...');
      const { data: newPamas, error: insertError } = await supabase
        .from('organizations')
        .insert({
          name: 'Pamas Imóveis',
          slug: 'pamasimoveis',
          subdomain: 'pamas',
          is_reseller: false,
          parent_id: reseller.id,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      pamas = newPamas;
      console.log('Organização criada com sucesso: ' + pamas.id);
    } else {
      console.log('Organização já existe: ' + pamas.id);
    }

    console.log('3. Lendo sitemap...');
    const sitemapUrl = 'https://pamasimoveis.com.br/sitemaps/propertys.xml';
    const sitemapRes = await fetch(sitemapUrl);
    const xml = await sitemapRes.text();

    const urls = [...xml.matchAll(/<loc>(.+?)<\/loc>/g)].map((m) => m[1]);
    console.log(`Encontrados ${urls.length} imóveis no sitemap.`);

    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({ headless: 'new' });

    for (const url of urls) {
      console.log(`Processando: ${url}`);
      try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Extrair dados via DOM
        const propertyData = await page.evaluate(() => {
          const title =
            document.querySelector('h1')?.innerText || document.title;

          let price = '';
          const priceEls = Array.from(document.querySelectorAll('*')).filter(
            (el) => el.innerText && el.innerText.includes('R$')
          );
          if (priceEls.length) {
            // heuristic: find the one with largest font size or just the first prominent one
            price =
              priceEls.find(
                (el) =>
                  el.tagName === 'H2' ||
                  el.tagName === 'H3' ||
                  el.tagName === 'P'
              )?.innerText || priceEls[0].innerText;
            // cleanup
            const match = price.match(/R\$\s*[\d.,]+/);
            if (match) price = match[0];
          }

          const description =
            document.querySelector('meta[property="og:description"]')
              ?.content || '';

          // Extrair imagens do carrossel/galeria
          const images = Array.from(document.querySelectorAll('img'))
            .map((img) => img.src)
            .filter((src) => src && src.includes('s3.amazonaws.com'));

          // Remover duplicadas
          const uniqueImages = [...new Set(images)];

          return { title, price, description, images: uniqueImages };
        });

        await page.close();

        console.log('--- IMÓVEL ---');
        console.log('Título:', propertyData.title);
        console.log('Descrição:', propertyData.description.substring(0, 50));
        console.log('Imagens Encontradas:', propertyData.images.length);
        console.log('Preço:', propertyData.price);

        // Limpar o preço para numérico
        let parsedPrice = propertyData.price
          ? propertyData.price.replace(/[R$.]/g, '').replace(',', '.')
          : '0';
        parsedPrice = parseFloat(parsedPrice.trim()) || 0;

        // Fazer o upload das imagens para o MinIO
        const uploadedImages = [];
        for (let i = 0; i < propertyData.images.length; i++) {
          const imgUrl = propertyData.images[i];
          try {
            const res = await fetch(imgUrl);
            if (res.ok) {
              const arrayBuffer = await res.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const filename = `pamas/${Date.now()}_${i}.jpg`;

              await minioClient.putObject(
                minioBucket,
                filename,
                buffer,
                buffer.length,
                {
                  'Content-Type': 'image/jpeg',
                }
              );

              const publicUrl = `${process.env.MINIO_PUBLIC_URL}/${minioBucket}/${filename}`;
              uploadedImages.push(publicUrl);
            }
          } catch (err) {
            console.error(
              `Falha ao baixar/enviar imagem ${imgUrl}:`,
              err.message
            );
          }
        }

        // Inserir no Supabase
        const { error: insertError } = await supabase
          .from('properties')
          .insert({
            organization_id: pamas.id,
            title: propertyData.title,
            description: propertyData.description,
            price: parsedPrice,
            images: uploadedImages,
            status: 'Disponível',
            purpose: 'Venda',
          });

        if (insertError) {
          console.error(
            `Erro ao inserir imóvel ${url} no BD:`,
            insertError.message
          );
        } else {
          console.log(`Imóvel inserido com sucesso!`);
        }

        // break removido para extrair todos os imóveis da lista
      } catch (err) {
        console.error(`Erro ao processar ${url}:`, err.message);
      }
    }

    await browser.close();
  } catch (err) {
    console.error(err);
  }
}

runMigration();
