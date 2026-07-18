import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';

import { uploadStorageObject } from './lib/storage-client.mjs';
import {
  applyBucketPolicy,
  getBucketPolicy,
  getConfiguredBucketName,
  isMinioConfigured,
} from '../server/lib/minio-storage.js';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.production', override: false });

const APPLY = process.argv.includes('--apply');
const HERO_SOURCE = readArg('--hero-source');
const ORG_ID =
  process.env.FAZENDAS_ORG_ID || 'ee2eafa9-929a-460e-a38a-2e13d259e7cb';
const SITE_BASE = 'https://www.fazendasbrasil.com.br';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_IMAGES = Number(process.env.FAZENDAS_PUBLIC_MAX_IMAGES || 0);
const BROKER_NAME = 'Renato Piovesana';
const rootRequire = createRequire(path.resolve('package.json'));

const OLD_PROPERTY_URLS = [
  '/17/imoveis/venda-fazenda-tailandia-pa',
  '/25/imoveis/venda-sitio-zona-rural-belo-horizonte-mg',
  '/24/imoveis/venda-area-taio-sc',
  '/23/imoveis/venda-area-guaraquecaba-pr',
  '/22/imoveis/venda-area-guaraquecaba-pr',
  '/16/imoveis/venda-fazenda-ponta-pora-ms',
  '/15/imoveis/venda-fazenda-confresa-mt',
  '/9/imoveis/venda-fazenda-santana-do-itarare-pr',
  '/11/imoveis/venda-chacara-morretes-pr',
  '/12/imoveis/venda-fazenda-cambuquira-mg',
  '/13/imoveis/venda-barracao-campo-de-santana-curitiba-pr',
  '/14/imoveis/venda-area-gralha-azul-fazenda-rio-grande-pr',
].map((url) => new URL(url, SITE_BASE).href);

const MANUAL_HINTS = {
  9: ['santana', 'itarare'],
  11: ['morretes'],
  13: ['industrial', 'curitiba'],
  14: ['fazenda', 'rio', 'grande'],
  17: ['tailandia'],
  22: ['50', 'guaraquecaba'],
  23: ['20', 'guaraquecaba'],
  24: ['200', 'taio'],
};

const BAD_IMAGE_PATTERN =
  /semfoto|logo|google|ssl|equipe|c49-info-whats|whatsapp|facebook|youtube|instagram|tiktok|favicon/i;
const LEGACY_STORAGE_PATTERN =
  /supabase\.(co|com)\/storage\/v1\/object\/public\/imobzyimg/i;
const MINIO_STORAGE_PATTERN =
  /nb\.consultio\.com\.br\/(imobzycrm|imobfluow|imobzy-media)\//i;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase service credentials are missing.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function decodeHtmlAttribute(value = '') {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)));
}

function cleanText(value) {
  return decodeHtmlAttribute(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeText(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugify(value) {
  return normalizeText(value).replace(/\s+/g, '-').slice(0, 72) || 'imovel';
}

function normalizeImages(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    return [value];
  }
  return [];
}

function hasUsableStoredImage(property) {
  return normalizeImages(property.images).some((url) =>
    MINIO_STORAGE_PATTERN.test(String(url))
  );
}

function needsImageRefresh(property) {
  const images = normalizeImages(property.images);
  if (hasUsableStoredImage(property)) return false;
  return (
    images.length === 0 ||
    images.every((url) => LEGACY_STORAGE_PATTERN.test(String(url)))
  );
}

function titleSimilarity(a, b) {
  const ignore = new Set([
    'uma',
    'para',
    'com',
    'das',
    'dos',
    'em',
    'de',
    'da',
    'do',
    'as',
    'os',
    'por',
    'px',
  ]);
  const aTokens = new Set(
    normalizeText(a)
      .split(/\s+/)
      .filter((token) => token.length > 2 && !ignore.has(token))
  );
  const bTokens = new Set(
    normalizeText(b)
      .split(/\s+/)
      .filter((token) => token.length > 2 && !ignore.has(token))
  );
  if (!aTokens.size || !bTokens.size) return 0;
  const intersection = [...aTokens].filter((token) =>
    bTokens.has(token)
  ).length;
  return intersection / Math.min(aTokens.size, bTokens.size);
}

function imagePriority(url) {
  if (/\/exportacao\/fotos\//i.test(url)) return 3;
  if (/\/admin\/imovel\/(?!mini\/)/i.test(url)) return 2;
  if (/\/admin\/imovel\/mini\//i.test(url)) return 1;
  return 0;
}

function normalizeImageUrl(rawValue, baseUrl) {
  const raw = decodeHtmlAttribute(String(rawValue || '').trim());
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return null;

  try {
    const url = new URL(raw.startsWith('//') ? `https:${raw}` : raw, baseUrl);
    if (!/\.(jpe?g|png|webp)$/i.test(url.pathname)) return null;
    url.hash = '';
    url.search = '';
    return url.href;
  } catch {
    return null;
  }
}

function collectImageUrls(html, baseUrl) {
  const images = [];
  const push = (raw) => {
    const url = normalizeImageUrl(raw, baseUrl);
    if (!url || BAD_IMAGE_PATTERN.test(url)) return;
    images.push(url);
  };

  const $ = cheerio.load(html);
  $('img, source, a, meta').each((_, element) => {
    for (const attribute of [
      'src',
      'data-src',
      'data-original',
      'href',
      'content',
    ]) {
      push($(element).attr(attribute));
    }
  });

  for (const match of html.matchAll(
    /(?:src|href|data-src|data-original|content)=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/gi
  )) {
    push(match[1]);
  }

  for (const match of html.matchAll(
    /url\((["']?)([^)"']+\.(?:jpe?g|png|webp)(?:\?[^)]*)?)\1\)/gi
  )) {
    push(match[2]);
  }

  const bestByFile = new Map();
  images.forEach((url, index) => {
    const file = path.basename(new URL(url).pathname).toLowerCase();
    const current = bestByFile.get(file);
    if (!current || imagePriority(url) > imagePriority(current.url)) {
      bestByFile.set(file, { url, index });
    }
  });

  return [...bestByFile.values()]
    .sort((a, b) => a.index - b.index)
    .map((item) => item.url);
}

function extractTitle(html) {
  const $ = cheerio.load(html);
  const title =
    $('h1').first().text() ||
    $('.c49-property-title').first().text() ||
    $('[itemprop="name"]').first().text() ||
    $('title').first().text();

  return cleanText(title)
    .replace(/\s*[-|]\s*Fazendas Brasil.*$/i, '')
    .replace(/\s*[-|]\s*Imobiliaria.*$/i, '')
    .trim();
}

function propertyCodeFromUrl(url) {
  return new URL(url).pathname.match(/^\/(\d+)\//)?.[1] || null;
}

function slugTextFromUrl(url) {
  const segment = new URL(url).pathname.split('/').filter(Boolean).pop() || '';
  return normalizeText(segment.replace(/-/g, ' '));
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125 Safari/537.36',
    },
  });
  if (!response.ok) throw new Error(`GET ${url} failed ${response.status}`);
  return response.text();
}

async function scrapeOldProperties() {
  const scraped = [];

  for (const url of OLD_PROPERTY_URLS) {
    try {
      const html = await fetchText(url);
      const code = propertyCodeFromUrl(url);
      const title = extractTitle(html);
      const imageUrls = collectImageUrls(html, url);
      scraped.push({
        code,
        url,
        title,
        slugText: slugTextFromUrl(url),
        imageUrls,
      });
      console.log(
        `scraped #${code}: ${title || '(no title)'} | images=${imageUrls.length}`
      );
    } catch (error) {
      console.warn(`scrape failed ${url}: ${error.message}`);
    }
  }

  return scraped;
}

async function fetchProperties() {
  const { data, error } = await supabase
    .from('properties')
    .select('id,title,external_id,source,images,features')
    .eq('organization_id', ORG_ID)
    .range(0, 5000);
  if (error) throw error;
  return data || [];
}

function hintMatch(scraped, properties) {
  const hints = MANUAL_HINTS[scraped.code] || [];
  if (!hints.length) return null;

  return (
    properties.find((property) => {
      const title = normalizeText(property.title);
      return hints.every((hint) => title.includes(hint));
    }) || null
  );
}

function findPropertyMatch(scraped, properties) {
  const hinted = hintMatch(scraped, properties);
  if (hinted) return { property: hinted, score: 1, reason: 'hint' };

  let best = null;
  let bestScore = 0;

  for (const property of properties) {
    const title = normalizeText(property.title);
    const titleScore = titleSimilarity(title, scraped.title);
    const slugScore = titleSimilarity(title, scraped.slugText);
    const codeScore =
      scraped.code &&
      String(property.external_id || '') === String(scraped.code)
        ? Math.max(titleScore, slugScore, 0.5)
        : 0;
    const score = Math.max(titleScore, slugScore, codeScore);

    if (score > bestScore) {
      best = property;
      bestScore = score;
    }
  }

  if (best && bestScore >= 0.68)
    return { property: best, score: bestScore, reason: 'title' };

  return { property: null, score: bestScore, reason: 'none' };
}

function imageExtension(url, contentType) {
  const fromContent = String(contentType || '')
    .split('/')[1]
    ?.split(';')[0];
  if (['jpeg', 'jpg', 'png', 'webp'].includes(fromContent))
    return fromContent === 'jpeg' ? '.jpg' : `.${fromContent}`;
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(extension)
    ? extension
    : '.jpg';
}

function downloadCandidates(url) {
  const candidates = [url];
  const filename = new URL(url).pathname.split('/').pop();

  if (/\/admin\/imovel\/mini\//i.test(url) && filename) {
    candidates.unshift(`${SITE_BASE}/exportacao/fotos/${filename}`);
    candidates.push(`${SITE_BASE}/admin/imovel/${filename}`);
  }

  if (/\/exportacao\/fotos\//i.test(url) && filename) {
    candidates.push(`${SITE_BASE}/admin/imovel/${filename}`);
  }

  return [...new Set(candidates)];
}

async function downloadImage(url) {
  let lastStatus = 'unknown';

  for (const candidate of downloadCandidates(url)) {
    const response = await fetch(candidate, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125 Safari/537.36',
      },
    });
    lastStatus = `${response.status} ${response.statusText}`;
    const contentType = response.headers.get('content-type') || '';

    if (response.ok && contentType.toLowerCase().startsWith('image/')) {
      const body = Buffer.from(await response.arrayBuffer());
      if (body.length > 2048) return { body, contentType, url: candidate };
    }

    await response.body?.cancel?.();
  }

  throw new Error(`image unavailable (${lastStatus}): ${url}`);
}

async function uploadImages(property, sourceUrls) {
  const uploaded = [];
  const targetUrls =
    MAX_IMAGES > 0 ? sourceUrls.slice(0, MAX_IMAGES) : sourceUrls;
  const slug = slugify(property.title);

  for (let index = 0; index < targetUrls.length; index += 1) {
    const sourceUrl = targetUrls[index];

    try {
      const downloaded = await downloadImage(sourceUrl);
      const hash = crypto
        .createHash('sha1')
        .update(downloaded.body)
        .digest('hex')
        .slice(0, 12);
      const ext = imageExtension(downloaded.url, downloaded.contentType);
      const key = `${ORG_ID}/fazendasbrasil-crm49/public-site/${property.id}-${slug}/foto-${index}-${hash}${ext}`;
      const result = await uploadStorageObject({
        supabase,
        bucket: 'property-images',
        path: key,
        body: downloaded.body,
        contentType: downloaded.contentType,
      });

      uploaded.push(result.publicUrl);
      console.log(
        `  uploaded ${index + 1}/${targetUrls.length}: ${result.publicUrl}`
      );
    } catch (error) {
      console.warn(`  image skipped: ${error.message}`);
    }
  }

  return uploaded;
}

async function uploadResponsiveWebp({
  sourcePath,
  key,
  width,
  height,
  quality,
}) {
  const sharp = rootRequire('sharp');
  const body = await sharp(sourcePath)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .webp({ quality })
    .toBuffer();

  return uploadStorageObject({
    supabase,
    bucket: 'property-images',
    path: key,
    body,
    contentType: 'image/webp',
  });
}

async function uploadSiteAssets() {
  if (!HERO_SOURCE) return { heroUrl: null, fallbackUrl: null };

  await fs.access(HERO_SOURCE);

  const hero = await uploadResponsiveWebp({
    sourcePath: HERO_SOURCE,
    key: `${ORG_ID}/fazendasbrasil-crm49/site/hero/fazendas-brasil-hero-clean.webp`,
    width: 1920,
    height: 920,
    quality: 86,
  });

  const fallback = await uploadResponsiveWebp({
    sourcePath: HERO_SOURCE,
    key: `${ORG_ID}/fazendasbrasil-crm49/site/fallback/fazendas-brasil-card-fallback.webp`,
    width: 900,
    height: 600,
    quality: 82,
  });

  return {
    heroUrl: hero.publicUrl,
    fallbackUrl: fallback.publicUrl,
  };
}

async function ensurePublicImagePrefix() {
  if (!isMinioConfigured()) return;

  const bucket = getConfiguredBucketName('media');
  const resource = `arn:aws:s3:::${bucket}/${ORG_ID}/fazendasbrasil-crm49/*`;
  const policy = (await getBucketPolicy(bucket)) || {
    Version: '2012-10-17',
    Statement: [],
  };
  const statementId = 'PublicReadFazendasBrasilMedia';
  let statement = policy.Statement.find((item) => item.Sid === statementId);

  if (!statement) {
    statement = {
      Sid: statementId,
      Effect: 'Allow',
      Principal: { AWS: ['*'] },
      Action: ['s3:GetObject'],
      Resource: [],
    };
    policy.Statement.push(statement);
  }

  const resources = Array.isArray(statement.Resource)
    ? statement.Resource
    : [statement.Resource].filter(Boolean);

  if (resources.includes(resource)) return;

  statement.Resource = [...new Set([...resources, resource])];
  await applyBucketPolicy(bucket, policy);
}

async function updatePropertyImages(property, images, mode) {
  if (!APPLY) return;

  const { error } = await supabase
    .from('properties')
    .update({
      images,
      features: {
        ...(property.features || {}),
        mediaMigration: {
          source: 'fazendasbrasil-public-site',
          mode,
          migratedAt: new Date().toISOString(),
        },
      },
    })
    .eq('id', property.id);

  if (error) throw error;
}

async function fixBrokerName() {
  if (!APPLY) return;

  const { error } = await supabase
    .from('organizations')
    .update({ owner_name: BROKER_NAME })
    .eq('id', ORG_ID);

  if (error) throw error;
}

async function main() {
  console.log(`mode=${APPLY ? 'apply' : 'dry-run'} org=${ORG_ID}`);
  if (!APPLY) console.log('Add --apply to upload files and update Supabase.');

  if (APPLY) await ensurePublicImagePrefix();

  const siteAssets = APPLY
    ? await uploadSiteAssets()
    : { heroUrl: null, fallbackUrl: null };

  if (siteAssets.heroUrl) console.log(`hero=${siteAssets.heroUrl}`);
  if (siteAssets.fallbackUrl) console.log(`fallback=${siteAssets.fallbackUrl}`);

  const [scraped, properties] = await Promise.all([
    scrapeOldProperties(),
    fetchProperties(),
  ]);

  const report = {
    mode: APPLY ? 'apply' : 'dry-run',
    heroUrl: siteAssets.heroUrl,
    fallbackUrl: siteAssets.fallbackUrl,
    matched: [],
    updatedFromOldSite: 0,
    fallbackApplied: 0,
    skippedWithMinio: 0,
    skippedNoMatch: 0,
  };

  const matchedPropertyIds = new Set();

  for (const item of scraped) {
    const match = findPropertyMatch(item, properties);
    const property = match.property;

    if (!property) {
      report.skippedNoMatch += 1;
      report.matched.push({
        code: item.code,
        title: item.title,
        images: item.imageUrls.length,
        action: 'no-match',
        score: Number(match.score.toFixed(2)),
      });
      continue;
    }

    matchedPropertyIds.add(property.id);

    if (!needsImageRefresh(property)) {
      report.skippedWithMinio += 1;
      report.matched.push({
        code: item.code,
        title: item.title,
        propertyId: property.id,
        propertyTitle: property.title,
        images: item.imageUrls.length,
        action: 'already-minio',
        reason: match.reason,
      });
      continue;
    }

    if (item.imageUrls.length > 0) {
      console.log(`\nMigrating #${item.code} -> ${property.title}`);
      const uploaded = APPLY
        ? await uploadImages(property, item.imageUrls)
        : item.imageUrls;

      if (uploaded.length > 0) {
        await updatePropertyImages(property, uploaded, 'old-site-images');
        report.updatedFromOldSite += 1;
        report.matched.push({
          code: item.code,
          title: item.title,
          propertyId: property.id,
          propertyTitle: property.title,
          images: uploaded.length,
          action: APPLY
            ? 'updated-from-old-site'
            : 'would-update-from-old-site',
          reason: match.reason,
        });
        continue;
      }
    }

    if (siteAssets.fallbackUrl) {
      await updatePropertyImages(
        property,
        [siteAssets.fallbackUrl],
        'clean-fallback'
      );
      report.fallbackApplied += 1;
    }

    report.matched.push({
      code: item.code,
      title: item.title,
      propertyId: property.id,
      propertyTitle: property.title,
      images: item.imageUrls.length,
      action: siteAssets.fallbackUrl ? 'fallback' : 'needs-fallback',
      reason: match.reason,
    });
  }

  if (siteAssets.fallbackUrl) {
    for (const property of properties) {
      if (matchedPropertyIds.has(property.id) || !needsImageRefresh(property))
        continue;
      await updatePropertyImages(
        property,
        [siteAssets.fallbackUrl],
        'clean-fallback-unmatched'
      );
      report.fallbackApplied += 1;
      report.matched.push({
        propertyId: property.id,
        propertyTitle: property.title,
        images: 0,
        action: 'fallback-unmatched',
      });
    }
  }

  await fixBrokerName();

  console.log('\nREPORT');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
