import { logger } from '@/utils/logger';
import { getApiUrl } from '../src/lib/api';
import { supabase } from './supabase';

type StorageBucket = 'agency-assets' | 'property-images' | 'imobzyimg' | 'imobzymsg' | 'whatsapp-media';
type ResolvedStorageBucket = 'imobzyimg' | 'imobzymsg' | 'whatsapp-media';

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

    const impId = sessionStorage.getItem('impersonated_org_id');
    if (impId && impId !== 'null') {
      headers.set('x-impersonate-org-id', impId);
    }

    const response = await fetch(getApiUrl('/api/storage/upload'), {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.error || `Erro no upload: ${response.statusText}`;
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

  return 'imobzyimg';
}
