import { supabase } from '../../services/supabase';

// Utility to handle API calls to the Railway backend
export const getApiUrl = (path: string = '') => {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
  const sanitizedBaseUrl = baseUrl.endsWith('/')
    ? baseUrl.slice(0, -1)
    : baseUrl;
  return sanitizedBaseUrl
    ? `${sanitizedBaseUrl}${sanitizedPath}`
    : sanitizedPath;
};

/**
 * Cliente de API Seguro:
 * Injeta automaticamente Authorization e x-impersonate-org-id
 */
export const callApi = async (path: string, options: RequestInit = {}) => {
  const url = getApiUrl(path);

  // Obter token da sessão atual do Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Injetar header de impersonação se ativo
  const impId = sessionStorage.getItem('impersonated_org_id');
  if (impId && impId !== 'null') {
    headers.set('x-impersonate-org-id', impId);
  }

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro na API: ${response.statusText}`);
  }

  return response.json();
};
