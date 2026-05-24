import { supabase } from '../../services/supabase';
import { getRuntimeEnv } from '../../utils/runtimeConfig';

const DEFAULT_API_URL = 'same-origin';

// Utility to handle API calls to the configured backend.
export const getApiUrl = (path: string = '') => {
  const baseUrl = normalizeApiBaseUrl(getRuntimeEnv('VITE_API_URL', DEFAULT_API_URL));
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
  const sanitizedBaseUrl = baseUrl.endsWith('/')
    ? baseUrl.slice(0, -1)
    : baseUrl;
  return sanitizedBaseUrl
    ? `${sanitizedBaseUrl}${sanitizedPath}`
    : sanitizedPath;
};

function normalizeApiBaseUrl(url: string): string {
  const clean = (url || '').trim();
  if (clean === '/' || clean.toLowerCase() === 'same-origin') {
    return '';
  }

  if (/web-production-7c3f0\.up\.railway\.app/i.test(clean)) {
    return '';
  }

  return clean || '';
}

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

  const routeEnvironmentType =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/urban')
      ? 'urban'
      : typeof window !== 'undefined' && window.location.pathname.startsWith('/rural')
        ? 'rural'
        : null;
  const storedEnvironmentType =
    typeof window !== 'undefined' ? localStorage.getItem('active_environment_type') : null;
  const environmentId =
    typeof window !== 'undefined'
      ? localStorage.getItem('active_environment_id') ||
        sessionStorage.getItem('active_environment_id')
      : null;
  if (environmentId && environmentId !== 'null' && (!routeEnvironmentType || storedEnvironmentType === routeEnvironmentType)) {
    headers.set('x-environment-id', environmentId);
  }
  if (typeof window !== 'undefined') {
    if (routeEnvironmentType) {
      headers.set('x-environment-type', routeEnvironmentType);
    }
  }

  const method = (options.method || 'GET').toUpperCase();
  if (!headers.has('Content-Type') && (options.body || method !== 'GET')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error(`Backend indisponível em ${url}: resposta HTML (${response.status})`);
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro na API: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(`Backend indisponível em ${url}: resposta HTML`);
  }

  return response.json();
};
