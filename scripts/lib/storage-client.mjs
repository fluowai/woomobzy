import {
  allowSupabaseStorageFallback,
  isMinioConfigured,
  resolveMediaBucket,
  uploadObject,
} from '../../server/lib/minio-storage.js';

const LEGACY_BUCKET_MAP = {
  properties: 'imobzycrm',
  'property-images': 'imobzycrm',
  'agency-assets': 'imobzycrm',
  imobzyimg: 'imobzycrm',
  'imobzy-media': 'imobzycrm',
  imobzycrm: 'imobzycrm',
  imobzymsg: 'imobzywhatsapp',
  'whatsapp-media': 'imobzywhatsapp',
  imobzywhatsapp: 'imobzywhatsapp',
  documents: 'documents',
  exports: 'exports',
};

export async function uploadStorageObject({ supabase, bucket = 'imobzycrm', path, body, contentType }) {
  const normalizedBucket = LEGACY_BUCKET_MAP[bucket] || bucket;

  if (isMinioConfigured()) {
    const minioBucket = resolveMediaBucket(normalizedBucket);
    if (!minioBucket) {
      throw new Error(`Bucket MinIO invalido: ${bucket}`);
    }

    return uploadObject({
      bucket: minioBucket,
      key: path,
      body,
      contentType,
    });
  }

  if (!allowSupabaseStorageFallback()) {
    throw new Error('MinIO nao configurado e fallback Supabase desabilitado.');
  }

  if (!supabase) {
    throw new Error('Cliente Supabase requerido para fallback de storage.');
  }

  const { error } = await supabase.storage
    .from(normalizedBucket)
    .upload(path, body, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message || 'Falha no upload Supabase.');
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(normalizedBucket).getPublicUrl(path);

  return {
    bucket: normalizedBucket,
    path,
    publicUrl,
    provider: 'supabase',
  };
}

export function isLegacySupabaseStorageUrl(value) {
  return /supabase\.(co|com)\/storage\/v1\/object\//i.test(String(value || ''));
}
