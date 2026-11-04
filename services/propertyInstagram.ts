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

export interface MediaPost {
  id: string;
  company_id: string;
  property_id: string;
  template: InstagramTemplate;
  format: InstagramFormat;
  image_index: number;
  storage_path: string;
  public_url: string;
  file_size_bytes: number;
  caption: string | null;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  posted_at: string | null;
  created_at: string;
}

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
    body: JSON.stringify({ template, format, imageIndex, save: false }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao gerar arte');
  }

  return res.blob();
}

export async function saveInstagramPost(
  propertyId: string,
  template: InstagramTemplate,
  format: InstagramFormat,
  imageIndex: number = 0
): Promise<{ mediaPost: MediaPost; url: string }> {
  const url = getApiUrl(`/api/properties/${propertyId}/instagram-post`);
  const headers = await authHeaders();
  headers.set('Content-Type', 'application/json');

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ template, format, imageIndex, save: true }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao salvar arte');
  }

  return res.json();
}

export async function listMediaPosts(
  propertyId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  posts: MediaPost[];
  pagination: { total: number; page: number; limit: number };
}> {
  const url = getApiUrl(
    `/api/properties/${propertyId}/instagram-post/list?page=${page}&limit=${limit}`
  );
  const headers = await authHeaders();

  const res = await fetch(url, { method: 'GET', headers });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao listar posts');
  }

  return res.json();
}

export async function deleteMediaPost(
  propertyId: string,
  postId: string
): Promise<void> {
  const url = getApiUrl(
    `/api/properties/${propertyId}/instagram-post/${postId}`
  );
  const headers = await authHeaders();

  const res = await fetch(url, { method: 'DELETE', headers });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao excluir post');
  }
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
    body: JSON.stringify({ template, format, imageIndex, save: false }),
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

export async function fetchPreviewImage(
  propertyId: string,
  template: InstagramTemplate,
  format: InstagramFormat,
  imageIndex: number = 0
): Promise<Blob> {
  const url = getPreviewUrl(propertyId, template, format, imageIndex);
  const headers = await authHeaders();
  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao carregar preview');
  }
  return res.blob();
}
