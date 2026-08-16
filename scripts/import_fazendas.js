require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '❌ Erro: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar no .env'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://www.fazendasbrasil.com.br';
const TARGET_URL = 'https://www.fazendasbrasil.com.br/imobiliaria/imoveis/0/1';

async function scrapeAndImport() {
  console.log(`🚜 Iniciando importação de: ${TARGET_URL}`);

  try {
    // 1. Buscar a página de listagem com User-Agent para evitar bloqueio básico
    const { data: pageHtml } = await axios.get(TARGET_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    const $ = cheerio.load(pageHtml);

    // Lista de links
    const propertyLinks = [];

    // O site parece usar links diretos nos cards
    // Selector genérico para pegar hrefs que pareçam imóvel
    $('a').each((i, el) => {
      const link = $(el).attr('href');
      if (
        link &&
        link.includes('/imobiliaria/imovel/') &&
        !propertyLinks.includes(link)
      ) {
        propertyLinks.push(link);
      }
    });

    console.log(
      `🔎 Encontrados ${propertyLinks.length} links de imóveis na página 1.`
    );

    // 2. Processar cada imóvel
    for (const link of propertyLinks) {
      const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
      console.log(`   > Processando: ${fullUrl}`);

      try {
        await processProperty(fullUrl);
      } catch (err) {
        console.warn(`   ⚠️ Erro ao processar ${fullUrl}: ${err.message}`);
      }

      // Delay gentil
      await new Promise((r) => setTimeout(r, 1500));
    }

    console.log('✅ Importação finalizada!');
  } catch (error) {
    console.error('❌ Erro fatal no scraper:', error);
  }
}

async function processProperty(url) {
  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });
  const $ = cheerio.load(html);

  // --- Extração ---

  // Título: geralmente h1
  const title = $('h1').text().trim() || 'Fazenda sem Título';

  // Detalhes: buscando texto cru para regex
  const bodyText = $('body').text();

  // Preço
  // Padrão esperado: R$ 10.000.000,00
  let price = 0;
  // Procura precificação específica se houver classe, senão regex no body
  // Tentativa em elementos comuns de preço
  let priceText = $('.valor').text().trim() || $('.price').text().trim();
  if (!priceText) {
    const match = bodyText.match(/R\$\s?[\d.,]+/);
    if (match) priceText = match[0];
  }

  if (priceText) {
    const clean = priceText.replace(/[^\d,]/g, '').replace(',', '.');
    price = parseFloat(clean);
  }

  // Descrição
  const description =
    $('.descricao-imovel').text().trim() ||
    $('.description').text().trim() ||
    $('p').first().text().trim().substring(0, 200);

  // Location (Cidade/UF)
  // Tentando extrair de breadcrumb ou texto
  let city = 'Não informada';
  let state = 'BR';
  // Ex: "Fazenda em Sorriso - MT"
  const locationMatch = title.match(/em\s([\w\s]+)\s?-\s?([A-Z]{2})/);
  if (locationMatch) {
    city = locationMatch[1].trim();
    state = locationMatch[2].trim();
  }

  // Área
  // Ex: "200 Hectares", "500 ha"
  let area = 0;
  const areaMatch = bodyText.match(/([\d.,]+)\s?(hectares|ha|alqueires)/i);
  if (areaMatch) {
    const val = parseFloat(areaMatch[1].replace('.', '').replace(',', '.'));
    const unit = areaMatch[2].toLowerCase();
    if (unit.includes('alq'))
      area = val * 48400; // Alqueire paulista aprox
    else area = val * 10000; // Hectare
  }

  // Imagens
  const images = [];
  $('img').each((i, el) => {
    const src = $(el).attr('src');
    if (
      src &&
      (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png')) &&
      !src.includes('logo') &&
      !src.includes('icon')
    ) {
      const full = src.startsWith('http') ? src : `${BASE_URL}${src}`;
      if (!images.includes(full)) images.push(full);
    }
  });

  // Mapeamento para DB (Schema properties)
  const dbPayload = {
    title: title,
    description: description,
    price: price,
    type: 'Terreno', // Default para fazendas
    status: 'Disponível',
    city: city,
    state: state,
    address: `${city} - ${state}`, // Fallback address
    neighborhood: 'Zona Rural',
    features: {
      area: area,
      bedrooms: 0,
      bathrooms: 0,
      garages: 0,
    },
    images: images.slice(0, 10), // Max 10 fotos
    highlighted: true, // Destacar os importados
  };

  const { error } = await supabase
    .from('properties')
    .upsert(dbPayload, { onConflict: 'title' }); // Usando titulo como chave aprox para evitar duplicatas em testes

  if (error) {
    console.error('     ❌ Erro Supabase:', error.message);
  } else {
    console.log(`     ✅ Salvo: ${title} (${images.length} fotos)`);
  }
}

scrapeAndImport();
