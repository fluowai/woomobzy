import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import { uploadStorageObject } from './lib/storage-client.mjs';
import {
  applyBucketPolicy,
  getBucketPolicy,
  getConfiguredBucketName,
  isMinioConfigured,
} from '../server/lib/minio-storage.js';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.production', override: false });

if (!process.env.MINIO_MEDIA_BUCKET && process.env.MINIO_WHATSAPP_BUCKET) {
  process.env.MINIO_MEDIA_BUCKET = process.env.MINIO_WHATSAPP_BUCKET;
}

const CRM_BASE = 'https://www.fazendasbrasil.com.br/crm';
const SITE_BASE = 'https://www.fazendasbrasil.com.br';
const FAZENDAS_ORG_SLUGS = ['fazendasbrasil', 'fazendas-brasil'];
const APPLY = process.argv.includes('--apply');
const MAX_IMAGES = Number(process.env.FAZENDAS_CRM_MAX_IMAGES || 0);
const CRM_USER = process.env.CRM_USER;
const CRM_PASS = process.env.CRM_PASS;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!CRM_USER || !CRM_PASS) throw new Error('Set CRM_USER and CRM_PASS.');
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase service credentials are missing.');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function collectCookies(headers) {
  const cookies = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : [headers.get('set-cookie')].filter(Boolean);
  return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
}

function decodeHtmlAttribute(value = '') {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)));
}

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitle(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titleSimilarity(a, b) {
  const ignore = new Set(['uma', 'para', 'com', 'das', 'dos', 'em', 'de', 'da', 'do', 'as', 'os']);
  const aTokens = new Set(String(a).split(/\s+/).filter((token) => token.length > 2 && !ignore.has(token)));
  const bTokens = new Set(String(b).split(/\s+/).filter((token) => token.length > 2 && !ignore.has(token)));
  if (!aTokens.size || !bTokens.size) return 0;
  const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
  return intersection / Math.min(aTokens.size, bTokens.size);
}

function parseNumber(value) {
  const text = String(value || '').replace(/[^\d,.]/g, '');
  if (!text) return null;
  const normalized = text.includes(',')
    ? text.replace(/\./g, '').replace(',', '.')
    : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function propertyTitle(row) {
  return cleanText(row.titulo || row.title || row.corpo).slice(0, 180) || `Imovel CRM49 #${row.codigo || row.id}`;
}

function propertyType(row) {
  return cleanText(row.categoria_nome || row.tipointerno_nome || 'Fazenda') || 'Fazenda';
}

function statusName(row) {
  const normalized = cleanText(row.situacao_nome || '').toLowerCase();
  if (normalized.includes('inativo')) return 'Inativo';
  if (normalized.includes('vendido')) return 'Vendido';
  if (normalized.includes('locado')) return 'Locado';
  if (normalized.includes('aprova')) return 'Em avaliacao';
  return 'Disponivel';
}

function isStoredImage(url) {
  return /\/storage\/v1\/object\/|n\.woopanel\.com\.br|supabase\.co|supabase\.com/i.test(String(url || ''));
}

function publicPhotoUrl(photo) {
  return `${SITE_BASE}/exportacao/fotos/${photo}`;
}

function originalPhotoUrlFromPublic(url) {
  const filename = String(url || '').match(/\/exportacao\/fotos\/([^/?#]+)/i)?.[1];
  return filename ? `${SITE_BASE}/admin/imovel/${filename}` : null;
}

function imageExtension(url, contentType) {
  const fromContent = String(contentType || '').split('/')[1]?.split(';')[0];
  if (['jpeg', 'jpg', 'png', 'webp'].includes(fromContent)) return fromContent === 'jpeg' ? '.jpg' : `.${fromContent}`;
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
}

async function crmLogin() {
  const response = await fetch(`${CRM_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: CRM_USER, password: CRM_PASS, client: 'web' }),
  });
  if (!response.ok) throw new Error(`CRM login failed ${response.status}: ${await response.text()}`);
  const cookie = collectCookies(response.headers);
  if (!cookie) throw new Error('CRM login succeeded but returned no cookie.');
  return cookie;
}

async function fetchCrmText(cookie, url, form = null) {
  const response = await fetch(url, {
    method: form ? 'POST' : 'GET',
    headers: {
      cookie,
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'x-requested-with': 'XMLHttpRequest',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
    },
    body: form ? new URLSearchParams(form) : undefined,
  });
  if (!response.ok) throw new Error(`CRM request failed ${response.status}: ${url}`);
  return response.text();
}

function parseRowsFromList(html) {
  const $ = cheerio.load(html);
  const publicLinks = new Map();
  for (const match of html.matchAll(/clipboard\.writeText\('([^']+\/(\d+)\/imoveis\/[^']+)'/g)) {
    publicLinks.set(match[2], decodeHtmlAttribute(match[1]));
  }

  const rows = [];
  $('input.toBeCheckedAll[data-keep]').each((_, el) => {
    const raw = decodeHtmlAttribute($(el).attr('value') || '');
    try {
      const row = JSON.parse(raw);
      row.publicUrl = publicLinks.get(String(row.id)) || null;
      rows.push(row);
    } catch (error) {
      console.warn(`Could not parse CRM property row: ${error.message}`);
    }
  });
  return rows;
}

function extractTotalPages(html) {
  const pageLinks = [...String(html).matchAll(/nextPage\('(\d+)'\)|lastPage\('(\d+)'\)/g)]
    .flatMap((match) => match.slice(1).filter(Boolean))
    .map(Number)
    .filter(Number.isFinite);
  return Math.max(1, ...pageLinks);
}

async function fetchCrmProperties(cookie) {
  const byId = new Map();
  let totalPages = 1;
  const baseForm = {
    filters: '[]',
    order: '',
    id_list: '',
    show: '',
    actions: 'null',
    actionsCustom: 'null',
    defaultWhere: 'true',
    id_modal: '',
    custom: 'null',
  };
  for (let page = 1; page <= totalPages; page += 1) {
    const html = await fetchCrmText(cookie, `${CRM_BASE}/md/imoveis/imoveis.list.php`, { ...baseForm, page });
    if (page === 1) totalPages = extractTotalPages(html);
    for (const row of parseRowsFromList(html)) byId.set(String(row.id), row);
  }
  return [...byId.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

async function fetchCrmPhotos(cookie, propertyId) {
  const html = await fetchCrmText(cookie, `${CRM_BASE}/md/imovel/imovel-update.modal.php`, {
    filters: JSON.stringify(''),
    others_filters: JSON.stringify({ id_imovel: propertyId, origin_request: 'default' }),
    id_modal: `sync${propertyId}`,
    new_modal: 'true',
    tab_modal: `nav-gallery-modal-sync${propertyId}`,
  });

  const photos = new Set();
  for (const match of html.matchAll(/exportacao\/fotos\/([^"')\s<>]+\.(?:jpe?g|png|webp))/gi)) {
    photos.add(publicPhotoUrl(match[1]));
  }
  const list = [...photos];
  return MAX_IMAGES > 0 ? list.slice(0, MAX_IMAGES) : list;
}

async function findOrganization() {
  const { data, error } = await supabase
    .from('organizations')
    .select('id,name,slug,custom_domain,subdomain')
    .in('slug', FAZENDAS_ORG_SLUGS);
  if (error) throw error;
  if (!data?.length) throw new Error('Fazendas Brasil organization not found.');
  return data.find((org) => org.slug === 'fazendasbrasil') || data[0];
}

async function getExistingProperties(organizationId) {
  const { data, error } = await supabase
    .from('properties')
    .select('id,title,price,source,external_id,images,features')
    .eq('organization_id', organizationId)
    .range(0, 5000);
  if (error) throw error;
  return data || [];
}

function findMatch(row, existing) {
  const external = existing.find((item) =>
    item.source === 'fazendasbrasil-crm49' && String(item.external_id) === String(row.id));
  if (external) return external;

  const legacy = existing.find((item) =>
    item.source === 'fazendasbrasil' && String(item.external_id) === String(row.id));
  if (legacy) return legacy;

  if (!cleanText(row.titulo || row.title)) return null;

  const normalized = normalizeTitle(propertyTitle(row));
  const exactTitle = existing.find((item) => normalizeTitle(item.title) === normalized);
  if (exactTitle) return exactTitle;

  const titleSlug = normalized.replace(/\s+/g, '-').slice(0, 28);
  if (titleSlug.length >= 16) {
    const imageSlug = existing.find((item) =>
      (item.images || []).some((image) => String(image || '').toLowerCase().includes(titleSlug)));
    if (imageSlug) return imageSlug;
  }

  let best = null;
  let bestScore = 0;
  for (const item of existing) {
    const score = titleSimilarity(normalizeTitle(item.title), normalized);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return bestScore >= 0.75 ? best : null;
}

function buildPayload(row, organizationId, images) {
  const price = parseNumber(row.valor_venda || row.valor || row.valor_venda_portal);
  const area = parseNumber(row.area || row.areautil);
  const features = {
    importedFrom: 'fazendasbrasil-crm49',
    crm49PropertyId: String(row.id),
    crm49Code: String(row.codigo || row.id),
    crm49ImageCount: Number(row.temfoto || 0),
    originalUrl: row.publicUrl,
    ownerName: cleanText(row.nome_proprietario),
    characteristics: (row.caracteristicas || []).map((item) => item.termo).filter(Boolean),
    finalidade: (row.finalidade || []).map((item) => item.fim).filter(Boolean),
  };

  const payload = {
    organization_id: organizationId,
    title: propertyTitle(row),
    description: cleanText(row.corpo),
    price,
    currency: 'BRL',
    status: statusName(row),
    purpose: 'Venda',
    property_type: propertyType(row),
    niche: String(row.tipointerno) === '4' ? 'rural' : 'urbano',
    source: 'fazendasbrasil-crm49',
    external_id: String(row.id),
    external_listing_status: cleanText(row.situacao_nome),
    external_updated_at: row.ultimaalteracao ? new Date(row.ultimaalteracao.replace(' ', 'T') + '-03:00').toISOString() : new Date().toISOString(),
    imported_at: new Date().toISOString(),
    images,
    features,
    highlighted: false,
    city: cleanText(row.cidade) || null,
    state: cleanText(row.sigla || row.estado) || null,
    location_city: cleanText(row.cidade) || null,
    location_state: cleanText(row.sigla || row.estado) || null,
    address: [cleanText(row.endereco), cleanText(row.nome_bairro), cleanText(row.cidade), cleanText(row.sigla || row.estado)].filter(Boolean).join(', ') || null,
  };

  if (area) {
    payload.total_area_ha = area;
    payload.area_total_ha = area;
    if (price) payload.price_per_ha = Number((price / area).toFixed(2));
  }

  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

async function uploadImages(row, organizationId, sourceImages) {
  const uploaded = [];
  const slug = normalizeTitle(propertyTitle(row)).replace(/\s+/g, '-').slice(0, 48) || row.id;

  for (let index = 0; index < sourceImages.length; index += 1) {
    const imageUrl = sourceImages[index];
    const candidates = [imageUrl, originalPhotoUrlFromPublic(imageUrl)].filter(Boolean);
    let response = null;
    let downloadedUrl = null;

    for (const candidate of candidates) {
      response = await fetch(candidate, {
        headers: { 'user-agent': 'Mozilla/5.0 Chrome/125 Safari/537.36' },
      });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.toLowerCase().startsWith('image/')) {
        downloadedUrl = candidate;
        break;
      }
      await response.body?.cancel?.();
    }

    if (!downloadedUrl) {
      console.warn(`      failed ${response?.status || 'unknown'}: ${imageUrl}`);
      continue;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = imageExtension(downloadedUrl, contentType);
    const hash = crypto.createHash('sha1').update(`${row.id}-${index}-${downloadedUrl}`).digest('hex').slice(0, 10);
    const key = `${organizationId}/fazendasbrasil-crm49/${row.id}-${slug}/foto-${index}-${hash}${ext}`;
    const { publicUrl } = await uploadStorageObject({
      supabase,
      bucket: 'property-images',
      path: key,
      body: buffer,
      contentType,
    });
    uploaded.push(publicUrl);
    console.log(`      foto ${index + 1}/${sourceImages.length}`);
  }
  return uploaded;
}

async function ensurePublicImagePrefix(organizationId) {
  if (!isMinioConfigured()) return;

  const bucket = getConfiguredBucketName('media');
  const resource = `arn:aws:s3:::${bucket}/${organizationId}/fazendasbrasil-crm49/*`;
  const policy = await getBucketPolicy(bucket) || {
    Version: '2012-10-17',
    Statement: [],
  };
  const statementId = 'PublicReadFazendasBrasilProperties';
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

const outputDir = path.resolve('outputs', 'fazendas-crm-properties');
await fs.mkdir(outputDir, { recursive: true });

const cookie = await crmLogin();
const organization = await findOrganization();
if (APPLY) await ensurePublicImagePrefix(organization.id);
const existing = await getExistingProperties(organization.id);
const crmRows = await fetchCrmProperties(cookie);

const report = {
  mode: APPLY ? 'apply' : 'dry-run',
  organization,
  crmPropertyCount: crmRows.length,
  crmWithPhotos: crmRows.filter((row) => Number(row.temfoto || 0) > 0).length,
  existingCount: existing.length,
  created: 0,
  updatedImages: 0,
  skippedAlreadyStored: 0,
  skippedNoPhotos: 0,
  errors: [],
  properties: [],
  generatedAt: new Date().toISOString(),
};

for (const row of crmRows) {
  const sourceImageCount = Number(row.temfoto || 0);
  const match = findMatch(row, existing);
  const currentImages = match?.images || [];
  const alreadyStored = currentImages.filter(isStoredImage).length;
  const item = {
    crmId: String(row.id),
    title: propertyTitle(row),
    crmStatus: cleanText(row.situacao_nome),
    crmPhotoCount: sourceImageCount,
    systemPropertyId: match?.id || null,
    systemImageCount: currentImages.length,
    action: 'none',
  };

  try {
    if (sourceImageCount <= 0) {
      item.action = match ? 'matched-no-crm-photos' : 'missing-no-crm-photos';
      report.skippedNoPhotos += 1;
      report.properties.push(item);
      continue;
    }

    const sourceImages = await fetchCrmPhotos(cookie, row.id);
    item.crmExtractedPhotoCount = sourceImages.length;

    if (match && alreadyStored >= sourceImages.length && sourceImages.length > 0) {
      item.action = 'already-stored';
      report.skippedAlreadyStored += 1;
      report.properties.push(item);
      continue;
    }

    if (!APPLY) {
      item.action = match ? 'would-update-images' : 'would-create';
      report.properties.push(item);
      continue;
    }

    console.log(`\n${match ? 'Atualizando' : 'Criando'} #${row.id}: ${item.title}`);
    const uploadedImages = await uploadImages(row, organization.id, sourceImages);
    const payload = buildPayload(row, organization.id, uploadedImages);

    if (match) {
      const mergedFeatures = {
        ...(match.features || {}),
        ...payload.features,
      };
      const updatePayload = {
        ...payload,
        features: mergedFeatures,
      };
      delete updatePayload.organization_id;
      delete updatePayload.imported_at;
      const { error } = await supabase
        .from('properties')
        .update(updatePayload)
        .eq('id', match.id);
      if (error) throw error;
      item.action = 'updated-images';
      item.uploadedImageCount = uploadedImages.length;
      report.updatedImages += 1;
    } else {
      const { data, error } = await supabase
        .from('properties')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      item.systemPropertyId = data.id;
      item.action = 'created';
      item.uploadedImageCount = uploadedImages.length;
      report.created += 1;
      existing.push({ id: data.id, title: payload.title, source: payload.source, external_id: payload.external_id, images: uploadedImages, features: payload.features });
    }
  } catch (error) {
    item.action = 'error';
    item.error = error.message;
    report.errors.push({ crmId: row.id, title: item.title, error: error.message });
  }

  report.properties.push(item);
}

await fs.writeFile(path.join(outputDir, 'crm-properties-sync-report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
