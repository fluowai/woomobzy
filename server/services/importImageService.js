import axios from 'axios';
import crypto from 'crypto';

import { getSupabaseServer } from '../lib/supabase-server.js';
import {
  allowSupabaseStorageFallback,
  getMinioPublicUrl,
  isMinioConfigured,
  resolveMediaBucket,
  uploadObject,
} from '../lib/minio-storage.js';
import { ensureStorageConfigLoaded } from './storageIntelligenceService.js';

const MAX_IMPORT_IMAGE_BYTES = 10 * 1024 * 1024;
const MIN_IMPORT_IMAGE_BYTES = 1024;
const IMPORT_BUCKET = 'imobzyimg';
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
};

const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const BAD_IMAGE_TERMS = [
  'avatar',
  'badge',
  'captcha',
  'facebook',
  'favicon',
  'google',
  'icon',
  'instagram',
  'linkedin',
  'logo',
  'marker',
  'maps',
  'no-image',
  'pixel',
  'placeholder',
  'profile',
  'recaptcha',
  'sem-foto',
  'sem_foto',
  'semfoto',
  'selo',
  'site-seguro',
  'sprite',
  'twitter',
  'whatsapp',
  'youtube',
];

const GOOD_IMAGE_TERMS = [
  '/foto',
  '/fotos',
  '/galeria',
  '/gallery',
  '/imovel',
  '/imoveis',
  '/property',
  '/properties',
  '/uploads',
  '/exportacao',
];

const IMAGE_ATTRS = [
  'data-foto',
  'data-full',
  'data-image',
  'data-img',
  'data-large',
  'data-lazy',
  'data-original',
  'data-src',
  'data-url',
  'src',
];

export function normalizeImportUrl(value, baseUrl) {
  const raw = String(value || '').trim();
  if (
    !raw ||
    raw.startsWith('#') ||
    /^(data|blob|javascript|mailto|tel):/i.test(raw)
  ) {
    return '';
  }

  try {
    return baseUrl ? new URL(raw, baseUrl).toString() : new URL(raw).toString();
  } catch {
    return '';
  }
}

export function collectPropertyImageUrls($, pageUrl, limit = 15) {
  const urls = [];

  const add = (value) => {
    for (const candidate of expandImageValue(value)) {
      const normalized = normalizeImportUrl(candidate, pageUrl);
      if (!normalized || !isLikelyPropertyImageUrl(normalized)) continue;
      if (!urls.includes(normalized)) urls.push(normalized);
      if (urls.length >= limit) return;
    }
  };

  $('img, source, a, [style]').each((_, el) => {
    if (urls.length >= limit) return;
    const node = $(el);

    for (const attr of IMAGE_ATTRS) {
      add(node.attr(attr));
      if (urls.length >= limit) return;
    }

    add(node.attr('srcset'));
    add(node.attr('data-srcset'));

    const href = node.attr('href');
    if (/\.(jpe?g|png|webp|gif|avif)(?:[?#].*)?$/i.test(String(href || ''))) {
      add(href);
    }

    const style = node.attr('style') || '';
    for (const match of style.matchAll(/url\((['"]?)(.*?)\1\)/gi)) {
      add(match[2]);
      if (urls.length >= limit) return;
    }
  });

  return urls.slice(0, limit);
}

export function sanitizePropertyImageUrls(urls = [], baseUrl = '', limit = 15) {
  const clean = [];
  for (const item of urls) {
    const normalized = normalizeImportUrl(item, baseUrl);
    if (!normalized || !isLikelyPropertyImageUrl(normalized)) continue;
    if (!clean.includes(normalized)) clean.push(normalized);
    if (clean.length >= limit) break;
  }
  return clean;
}

export async function migratePropertyImages(
  imageUrls,
  organizationId,
  options = {}
) {
  const {
    limit = 15,
    folder = 'properties/imported',
    entityId = null,
    sourceUrl = '',
  } = options;
  const uniqueUrls = [...new Set((imageUrls || []).filter(Boolean))].slice(
    0,
    limit
  );
  const uploaded = [];

  if (!uniqueUrls.length) return uploaded;

  await ensureStorageConfigLoaded();

  for (const imageUrl of uniqueUrls) {
    try {
      const downloaded = await downloadImportImage(imageUrl, sourceUrl);
      const publicUrl = await uploadImportImage({
        organizationId,
        folder,
        entityId,
        sourceUrl: imageUrl,
        ...downloaded,
      });
      uploaded.push(publicUrl);
    } catch (error) {
      console.warn(
        `[Import Images] Falha ao migrar ${imageUrl}:`,
        error.message
      );
    }
  }

  return uploaded;
}

async function downloadImportImage(imageUrl, referer = '') {
  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 15000,
    maxContentLength: MAX_IMPORT_IMAGE_BYTES,
    headers: {
      ...REQUEST_HEADERS,
      ...(referer ? { Referer: referer } : {}),
    },
  });

  const buffer = Buffer.from(response.data);
  const contentType = normalizeImageMime(
    response.headers['content-type'] || mimeFromUrl(imageUrl)
  );

  if (!contentType) {
    throw new Error(
      `Tipo de arquivo nao reconhecido: ${response.headers['content-type'] || 'sem MIME'}`
    );
  }

  if (buffer.length < MIN_IMPORT_IMAGE_BYTES) {
    throw new Error('Imagem pequena demais para ser foto de imovel.');
  }

  if (buffer.length > MAX_IMPORT_IMAGE_BYTES) {
    throw new Error('Imagem acima do limite de 10 MB.');
  }

  return { buffer, contentType };
}

async function uploadImportImage({
  organizationId,
  folder,
  entityId,
  sourceUrl,
  buffer,
  contentType,
}) {
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const ext = EXTENSION_BY_MIME[contentType] || '.jpg';
  const key = buildImportImageKey(organizationId, folder, sha256, ext);

  if (isMinioConfigured()) {
    const minioBucket = resolveMediaBucket(IMPORT_BUCKET);
    if (!minioBucket) throw new Error('Bucket MinIO de imagens invalido.');

    const existing = await findReusableStorageObject(
      organizationId,
      minioBucket,
      sha256
    );
    if (existing) {
      return getMinioPublicUrl({
        bucket: existing.bucket,
        key: existing.object_key,
      });
    }

    const result = await uploadObject({
      bucket: minioBucket,
      key,
      logicalBucket: IMPORT_BUCKET,
      body: buffer,
      contentType,
    });

    await persistStorageObject({
      tenantId: organizationId,
      bucket: result.bucket,
      objectKey: result.path,
      sha256,
      etag: result.etag,
      sizeBytes: buffer.length,
      mimeType: contentType,
      source: 'property_import',
      entityType: entityId ? 'property' : null,
      entityId,
      details: { sourceUrl },
    });

    return result.publicUrl;
  }

  if (!allowSupabaseStorageFallback()) {
    throw new Error('MinIO nao configurado para importar imagens.');
  }

  const supabase = getSupabaseServer();
  const { error } = await supabase.storage
    .from(IMPORT_BUCKET)
    .upload(key, buffer, {
      contentType,
      upsert: true,
    });
  if (error) throw error;

  const { data } = supabase.storage.from(IMPORT_BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

async function findReusableStorageObject(tenantId, bucket, sha256) {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('storage_objects')
      .select('bucket, object_key')
      .eq('tenant_id', tenantId)
      .eq('bucket', bucket)
      .eq('sha256', sha256)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (/does not exist|schema cache|PGRST/i.test(error.message || ''))
        return null;
      throw error;
    }

    return data || null;
  } catch (error) {
    console.warn(
      '[Import Images] Consulta de deduplicacao indisponivel:',
      error.message
    );
    return null;
  }
}

async function persistStorageObject(payload) {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from('storage_objects').upsert(
      {
        tenant_id: payload.tenantId,
        bucket: payload.bucket,
        object_key: payload.objectKey,
        sha256: payload.sha256,
        etag: payload.etag || null,
        size_bytes: payload.sizeBytes || null,
        mime_type: payload.mimeType || null,
        source: payload.source || 'property_import',
        entity_type: payload.entityType || null,
        entity_id: payload.entityId || null,
        deleted_at: null,
      },
      { onConflict: 'bucket,object_key' }
    );

    if (error) {
      if (/does not exist|schema cache|PGRST/i.test(error.message || ''))
        return;
      throw error;
    }
  } catch (error) {
    console.warn(
      '[Import Images] Registro storage_objects indisponivel:',
      error.message
    );
  }
}

function buildImportImageKey(organizationId, folder, sha256, ext) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const safeFolder = sanitizePath(folder || 'properties/imported');
  return `${organizationId}/${safeFolder}/${year}/${month}/${sha256}${ext}`;
}

function sanitizePath(value) {
  return (
    String(value)
      .split('/')
      .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, '-'))
      .filter(Boolean)
      .join('/') || 'properties/imported'
  );
}

function expandImageValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];

  if (raw.includes(',')) {
    return raw
      .split(',')
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean);
  }

  return [raw.split(/\s+/)[0]];
}

function isLikelyPropertyImageUrl(value) {
  const lower = decodeURIComponent(String(value || '')).toLowerCase();
  if (!/^https?:\/\//.test(lower)) return false;
  if (BAD_IMAGE_TERMS.some((term) => lower.includes(term))) return false;
  if (/\.(jpe?g|png|webp|gif|avif)(?:[?#].*)?$/i.test(lower)) return true;
  return GOOD_IMAGE_TERMS.some((term) => lower.includes(term));
}

function normalizeImageMime(value) {
  const mime = String(value || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (EXTENSION_BY_MIME[mime]) return mime;
  return '';
}

function mimeFromUrl(value) {
  const pathname = (() => {
    try {
      return new URL(value).pathname;
    } catch {
      return String(value || '');
    }
  })();

  const ext = pathname.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'avif') return 'image/avif';
  return '';
}
