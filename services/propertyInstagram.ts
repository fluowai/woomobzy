import { getApiUrl } from '../src/lib/api';
import { supabase } from './supabase';

export type InstagramTemplate = 'padrao' | 'luxo' | 'rural' | 'moderno';
export type InstagramFormat = '1080x1080' | '1080x1350';

export const TEMPLATE_LABELS: Record<InstagramTemplate, string> = {
  padrao: 'Padrão',
  luxo: 'Luxo',
  rural: 'Rural',
  moderno: 'Moderno',
};

export const FORMAT_LABELS: Record<InstagramFormat, string> = {
  '1080x1080': 'Quadrado (1:1)',
  '1080x1350': 'Portrait (4:5)',
};

async function authHeaders(): Promise<Headers> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers();
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  if (typeof window !== 'undefined') {
    headers.set('x-tenant-domain', window.location.hostname);
  }
  return headers;
}

export async function generateInstagramPost(
  propertyId: string,
  template: InstagramTemplate,
  format: InstagramFormat,
  imageIndex: number = 0
): Promise<Blob> {
  const url = getApiUrl(`/api/properties/${propertyId}/instagram-post`);
  const headers = await authHeaders();
  headers.set('Content-Type', 'application/json');

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ template, format, imageIndex }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao gerar arte');
  }

  return res.blob();
}

export async function downloadInstagramPost(
  propertyId: string,
  template: InstagramTemplate,
  format: InstagramFormat,
  imageIndex: number = 0,
  filename: string = 'instagram-post.png'
): Promise<void> {
  const url = getApiUrl(`/api/properties/${propertyId}/instagram-post`);
  const headers = await authHeaders();
  headers.set('Content-Type', 'application/json');

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ template, format, imageIndex }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao gerar arte');
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function getPreviewUrl(
  propertyId: string,
  template: InstagramTemplate,
  format: InstagramFormat,
  imageIndex: number = 0
): string {
  return getApiUrl(
    `/api/properties/${propertyId}/instagram-post/preview?template=${template}&format=${format}&imageIndex=${imageIndex}`
  );
}
