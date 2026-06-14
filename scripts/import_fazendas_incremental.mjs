import crypto from 'crypto';
import path from 'path';

import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import { uploadStorageObject } from './lib/storage-client.mjs';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.production', override: false });

if (!process.env.MINIO_MEDIA_BUCKET && process.env.MINIO_WHATSAPP_BUCKET) {
  process.env.MINIO_MEDIA_BUCKET = process.env.MINIO_WHATSAPP_BUCKET;
}

const BASE_URL = 'https://www.fazendasbrasil.com.br';
const LISTING_URL_TEMPLATE = `${BASE_URL}/imobiliaria/imoveis/0/`;
const FAZENDAS_ORG_SLUG = 'fazendasbrasil';
const MAX_PAGES = Number(process.env.FAZENDAS_MAX_PAGES || 30);
const MAX_IMAGES = Number(process.env.FAZENDAS_MAX_IMAGES || 20);
const APPLY = process.argv.includes('--apply');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const http = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
  },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function absoluteUrl(value) {
  if (!value) return '';
  return new URL(String(value).trim(), BASE_URL).toString().replace(/([^:]\/)\/+/g, '$1');
}

function cleanText(value) {
  return String(value || '').replace(/\?{2,}/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeTitle(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function propertyIdFromUrl(url) {
  const value = String(url || '');
  if (!value.startsWith(`${BASE_URL}/`)) return '';
  const match = value.match(/fazendasbrasil\.com\.br\/(\d+)\/imoveis\//i);
  return match?.[1] || '';
}

function parsePrice(text) {
  const match = String(text || '').match(/R\$\s*([\d.]+,\d{2}|[\d.]+)/i);
  if (!match) return 0;
  return Number(match[1].replace(/\./g, '').replace(',', '.')) || 0;
}

function parseAreaHa(text) {
  const candidates = [...String(text || '').matchAll(/([\d.]+(?:,\d+)?)\s*(hectares|hectare|ha|alqueires|alqueire)\b/gi)];
  if (candidates.length === 0) return null;

  const [raw, unit] = candidates[0].slice(1);
  let value = Number(raw.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(value)) return null;
  if (/alqueire/i.test(unit)) value *= 4.84;
  return Number(value.toFixed(2));
}

function parseLocation({ title, htmlText }) {
  const sources = [title, htmlText];
  for (const source of sources) {
    const slashMatch = String(source || '').match(/\b([A-Za-zÀ-ÿ\s.'-]{2,80})\/([A-Z]{2})\b/);
    if (slashMatch) {
      return { city: cleanText(slashMatch[1]), state: slashMatch[2] };
    }

    const match = String(source || '').match(/\b(?:em|de)\s+([A-Za-zÀ-ÿ\s.'-]{2,80})\s*[-,]\s*([A-Z]{2})\b/);
    if (match) {
      return { city: cleanText(match[1]), state: match[2] };
    }
  }
  return { city: null, state: null };
}

function inferPropertyType(title) {
  const normalized = normalizeTitle(title);
  if (normalized.includes('sitio')) return 'Sítio';
  if (normalized.includes('chacara')) return 'Chácara';
  if (normalized.includes('area')) return 'Terreno Rural';
  return 'Fazenda';
}

function imageExtension(url, contentType) {
  const fromContent = String(contentType || '').split('/')[1]?.split(';')[0];
  if (fromContent && ['jpeg', 'jpg', 'png', 'webp'].includes(fromContent)) {
    return fromContent === 'jpeg' ? '.jpg' : `.${fromContent}`;
  }

  const ext = path.extname(new URL(url).pathname).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
}

function isValidImage(src) {
  const lower = String(src || '').toLowerCase();
  if (!/\.(jpe?g|png|webp)(\?|$)/i.test(lower)) return false;
  if (/(logo|icon|facebook|instagram|twitter|youtube|tiktok|whatsapp|semfoto|pixel|gallery\/google|ssl|banner)/i.test(lower)) {
    return false;
  }
  return /\/exportacao\/fotos\/|\/admin\/imovel\/|\/fotos\//i.test(lower);
}

function collectImages($) {
  const images = new Set();

  $('[data-foto]').each((_, el) => {
    const src = $(el).attr('data-foto');
    if (isValidImage(src)) images.add(absoluteUrl(src));
  });

  $('[style*="background-image"]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const match = style.match(/url\(['"]?([^'")]+)['"]?\)/i);
    if (match && isValidImage(match[1])) images.add(absoluteUrl(match[1]));
  });

  $('img').each((_, el) => {
    const src = $(el).attr('data-src') || $(el).attr('src');
    if (isValidImage(src) && !String(src).includes('/mini/')) images.add(absoluteUrl(src));
  });

  return [...images].slice(0, MAX_IMAGES);
}

async function getFazendasOrganization() {
  const { data, error } = await supabase
    .from('organizations')
    .select('id,name,slug')
    .eq('slug', FAZENDAS_ORG_SLUG)
    .single();

  if (error) throw new Error(`Organizacao ${FAZENDAS_ORG_SLUG} nao encontrada: ${error.message}`);
  return data;
}

async function getExistingProperties(organizationId) {
  const { data, error } = await supabase
    .from('properties')
    .select('id,title,price,source,external_id,images')
    .eq('organization_id', organizationId)
    .range(0, 5000);

  if (error) throw new Error(`Falha ao consultar imoveis existentes: ${error.message}`);
  return data || [];
}

async function scrapeListingLinks() {
  const links = new Map();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = `${LISTING_URL_TEMPLATE}${page}`;
    const { data: html } = await http.get(url);
    const $ = cheerio.load(html);
    let foundOnPage = 0;

    $('a[href*="/imoveis/"]').each((_, el) => {
      const href = $(el).attr('href');
      const fullUrl = absoluteUrl(href);
      const externalId = propertyIdFromUrl(fullUrl);
      if (!externalId) return;
      if (!links.has(externalId)) foundOnPage += 1;
      links.set(externalId, fullUrl);
    });

    console.log(`Pagina ${page}: ${foundOnPage} links novos`);
    if (foundOnPage === 0) break;
    await sleep(500);
  }

  return [...links.entries()].map(([externalId, url]) => ({ externalId, url }));
}

async function scrapeProperty({ externalId, url }) {
  const { data: html } = await http.get(url);
  const $ = cheerio.load(html);
  const bodyText = cleanText($('body').text());
  const metaDescription = cleanText($('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content'));
  const pageTitle = cleanText($('title').first().text()).replace(/\s*\|\s*Fazendas Brasil\s*$/i, '');
  const detailIntro = cleanText($('.c49-property-features p, .c49-property-description p, .descricao p').first().text());
  const description =
    cleanText($('.c49-property-description, .descricao, [class*="descr"]').first().text()) ||
    detailIntro ||
    metaDescription ||
    bodyText.slice(0, 1600);
  const title =
    cleanText($('h1').first().text()) ||
    cleanText(detailIntro.split(/\r?\n|Valor:|Localizado\b/i)[0]) ||
    cleanText(metaDescription.split(/[.!?]\s| - /)[0]) ||
    pageTitle ||
    cleanText($(`a[href="${url}"]`).first().text()) ||
    `Imovel Fazendas Brasil #${externalId}`;
  const price = parsePrice(bodyText);
  const areaHa = parseAreaHa(bodyText);
  const { city, state } = parseLocation({ title, htmlText: bodyText });
  const images = collectImages($);

  return {
    externalId,
    sourceUrl: url,
    title,
    description,
    price,
    areaHa,
    city,
    state,
    propertyType: inferPropertyType(title),
    images,
  };
}

function isMatch(scraped, existing) {
  if (existing.source === 'fazendasbrasil' && existing.external_id === scraped.externalId) return true;
  const normalized = normalizeTitle(scraped.title);
  const existingTitle = normalizeTitle(existing.title);
  return existingTitle === normalized;
}

function findMatch(scraped, existing) {
  const exact = existing.find((item) => isMatch(scraped, item));
  if (exact) return exact;

  const normalized = normalizeTitle(scraped.title);
  let best = null;
  let bestScore = 0;
  for (const item of existing) {
    const score = titleSimilarity(normalizeTitle(item.title), normalized);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }

  return bestScore >= 0.45 ? best : null;
}

function titleSimilarity(a, b) {
  const ignore = new Set(['a', 'o', 'os', 'as', 'de', 'da', 'do', 'das', 'dos', 'em', 'para', 'com', 'r']);
  const aTokens = new Set(String(a).split(/\s+/).filter((token) => token.length > 2 && !ignore.has(token)));
  const bTokens = new Set(String(b).split(/\s+/).filter((token) => token.length > 2 && !ignore.has(token)));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
  return intersection / Math.min(aTokens.size, bTokens.size);
}

function buildPayload(property, organizationId, uploadedImages) {
  const features = {
    areaHectares: property.areaHa,
    originalUrl: property.sourceUrl,
    originalImageCount: property.images.length,
    importedFrom: 'fazendasbrasil.com.br',
  };

  const payload = {
    organization_id: organizationId,
    title: property.title,
    description: property.description,
    price: property.price || null,
    currency: 'BRL',
    status: 'Disponível',
    purpose: 'Venda',
    property_type: property.propertyType,
    niche: 'rural',
    source: 'fazendasbrasil',
    external_id: property.externalId,
    external_listing_status: 'active',
    external_updated_at: new Date().toISOString(),
    imported_at: new Date().toISOString(),
    images: uploadedImages,
    features,
    highlighted: false,
  };

  if (property.areaHa) {
    payload.total_area_ha = property.areaHa;
    payload.area_total_ha = property.areaHa;
    if (property.price) payload.price_per_ha = Number((property.price / property.areaHa).toFixed(2));
  }

  if (property.city) {
    payload.city = property.city;
    payload.location_city = property.city;
  }

  if (property.state) {
    payload.state = property.state;
    payload.location_state = property.state;
  }

  if (property.city || property.state) {
    payload.address = [property.city, property.state].filter(Boolean).join(' - ');
  }

  return payload;
}

async function uploadImages(property, organizationId) {
  const uploaded = [];
  const slug = normalizeTitle(property.title).replace(/\s+/g, '-').slice(0, 48) || property.externalId;

  for (let index = 0; index < property.images.length; index += 1) {
    const imageUrl = property.images[index];
    const response = await http.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const ext = imageExtension(imageUrl, response.headers['content-type']);
    const hash = crypto.createHash('sha1').update(`${property.externalId}-${index}-${imageUrl}`).digest('hex').slice(0, 10);
    const key = `${organizationId}/fazendasbrasil/${property.externalId}-${slug}/foto-${index}-${hash}${ext}`;
    const { publicUrl } = await uploadStorageObject({
      supabase,
      bucket: 'property-images',
      path: key,
      body: buffer,
      contentType: response.headers['content-type'] || 'image/jpeg',
    });
    uploaded.push(publicUrl);
    console.log(`      foto ${index + 1}/${property.images.length} enviada`);
    await sleep(150);
  }

  return uploaded;
}

async function main() {
  console.log(APPLY ? 'Modo APPLY: migrando ausentes.' : 'Modo DRY-RUN: apenas comparando.');

  const organization = await getFazendasOrganization();
  const existing = await getExistingProperties(organization.id);
  const links = await scrapeListingLinks();
  const scraped = [];

  for (const link of links) {
    const property = await scrapeProperty(link);
    scraped.push(property);
    await sleep(500);
  }

  const matched = [];
  const missing = [];

  for (const property of scraped) {
    const found = findMatch(property, existing);
    if (found) matched.push({ property, existing: found });
    else missing.push(property);
  }

  console.log('\nResumo da comparacao');
  console.log(`- Imoveis no site: ${scraped.length}`);
  console.log(`- Imoveis na base Fazendas Brasil: ${existing.length}`);
  console.log(`- Batem com a base: ${matched.length}`);
  console.log(`- Ausentes para migrar: ${missing.length}`);

  if (matched.length > 0) {
    console.log('\nImoveis que bateram:');
    matched.forEach(({ property, existing: found }) => {
      console.log(`- #${property.externalId} ${property.title} -> ${found.id}`);
    });
  }

  if (missing.length > 0) {
    console.log('\nAusentes:');
    missing.forEach((property) => {
      console.log(`- #${property.externalId} ${property.title} (${property.images.length} fotos)`);
    });
  }

  if (!APPLY || missing.length === 0) return;

  let imported = 0;
  for (const property of missing) {
    console.log(`\nMigrando #${property.externalId}: ${property.title}`);
    const uploadedImages = await uploadImages(property, organization.id);
    const payload = buildPayload(property, organization.id, uploadedImages);
    const { data, error } = await supabase.from('properties').insert(payload).select('id').single();
    if (error) {
      console.error(`   erro ao inserir: ${error.message}`);
      continue;
    }
    imported += 1;
    console.log(`   importado: ${data.id} (${uploadedImages.length} fotos)`);
  }

  console.log(`\nConcluido. Imoveis importados: ${imported}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
