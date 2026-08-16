import { logger } from '@/utils/logger';
import { getApiUrl } from '../src/lib/api';
import {
  clearImpersonationSession,
  getImpersonationHeaders,
  isImpersonationErrorCode,
} from '../src/lib/impersonation';
import { supabase } from './supabase';

type StorageBucket =
  | 'agency-assets'
  | 'property-images'
  | 'imobzyimg'
  | 'imobzymsg'
  | 'whatsapp-media'
  | 'documents';
type ResolvedStorageBucket =
  | 'imobzyimg'
  | 'imobzymsg'
  | 'whatsapp-media'
  | 'documents';

export const uploadFile = async (
  file: File,
  bucket: StorageBucket,
  folder?: string
): Promise<string | null> => {
  try {
    const storageBucket = resolveStorageBucket(bucket);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', storageBucket);
    if (folder) formData.append('folder', folder);

    const headers = new Headers();
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    for (const [key, value] of Object.entries(getImpersonationHeaders())) {
      headers.set(key, value);
    }

    const response = await fetch(getApiUrl('/api/storage/upload'), {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.error || `Erro no upload: ${response.statusText}`;
      if (isImpersonationErrorCode(data.code)) {
        clearImpersonationSession();
      }
      logger.error('Erro detalhado no upload:', data);
      alert(`Erro no upload: ${message}`);
      throw new Error(message);
    }

    logger.info('Upload sucesso. URL:', data.publicUrl);
    return data.publicUrl || null;
  } catch (error) {
    logger.error('Falha ao fazer upload da imagem:', error);
    return null;
  }
};

function resolveStorageBucket(bucket: StorageBucket): ResolvedStorageBucket {
  if (bucket === 'agency-assets' || bucket === 'property-images') {
    return 'imobzyimg';
  }

  if (bucket === 'imobzymsg' || bucket === 'whatsapp-media') {
    return bucket;
  }

  if (bucket === 'documents') {
    return 'documents';
  }

  return 'imobzyimg';
}
