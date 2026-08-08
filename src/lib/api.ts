import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { supabase } from '../../services/supabase';
import { getRuntimeEnv } from '../../utils/runtimeConfig';
import {
  clearImpersonationSession,
  getImpersonationHeaders,
  isImpersonationErrorCode,
} from './impersonation';

const DEFAULT_API_URL = 'same-origin';

// Utility to handle API calls to the configured backend.
export const getApiUrl = (path: string = '') => {
  const baseUrl = normalizeApiBaseUrl(
    getRuntimeEnv('VITE_API_URL', DEFAULT_API_URL)
  );
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

  return clean || '';
}

let _activeOrganizationId: string | null = null;
let _activeOrganizationUserId: string | null = null;

export function setActiveOrganizationId(
  id: string | null,
  userId?: string | null
) {
  _activeOrganizationId = id;
  _activeOrganizationUserId = id && userId ? userId : null;
}

export function getActiveOrganizationId(): string | null {
  if (!_activeOrganizationUserId) return null;
  return _activeOrganizationId;
}

export function clearStaleOrganizationData(userId?: string | null) {
  const storedUserId = sessionStorage.getItem('active_organization_user_id');
  const storedOrgId = sessionStorage.getItem('active_organization_id');

  if (storedUserId && userId && storedUserId !== userId) {
    sessionStorage.removeItem('active_organization_id');
    sessionStorage.removeItem('active_organization_user_id');
    setActiveOrganizationId(null);
  }

  if (!storedUserId && storedOrgId) {
    sessionStorage.removeItem('active_organization_id');
  }
}

export interface CallApiOptions extends RequestInit {
  hideError?: boolean;
}

export const callApi = async (path: string, options: CallApiOptions = {}) => {
  try {
    const url = getApiUrl(path);

    const {
      data: { session: initialSession },
    } = await supabase.auth.getSession();
    const headers = new Headers(options.headers || {});
    if (initialSession?.access_token) {
      headers.set('Authorization', `Bearer ${initialSession.access_token}`);
    }

    for (const [key, value] of Object.entries(getImpersonationHeaders())) {
      headers.set(key, value);
    }

    // Inject BYOB tenant domain
    if (typeof window !== 'undefined') {
      headers.set('x-tenant-domain', window.location.hostname);
    }

    const method = (options.method || 'GET').toUpperCase();
    const isFormData =
      typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (
      !isFormData &&
      !headers.has('Content-Type') &&
      (options.body || method !== 'GET')
    ) {
      headers.set('Content-Type', 'application/json');
    }

    const request = () => fetch(url, { ...options, headers });
    let response = await request();

    // The stored session can expire between getSession() and the API request.
    let refreshErrorMessage = '';
    if (response.status === 401 && initialSession?.refresh_token) {
      const {
        data: { session: refreshedSession },
        error: refreshError,
      } = await supabase.auth.refreshSession({
        refresh_token: initialSession.refresh_token,
      });

      if (!refreshError && refreshedSession?.access_token) {
        headers.set('Authorization', `Bearer ${refreshedSession.access_token}`);
        response = await request();
      } else {
        refreshErrorMessage =
          refreshError?.message || 'nao foi possivel renovar a sessao';
      }
    }

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error(
          `Backend indisponível em ${url}: resposta HTML (${response.status})`
        );
      }

      if (response.status === 401) {
        logger.warn(
          refreshErrorMessage
            ? `[API] Falha de autenticacao detectada (401); renovacao falhou: ${refreshErrorMessage}`
            : '[API] Falha de autenticacao detectada (401) apos renovar a sessao.'
        );
        // Revertido o logout automatico para nao deslogar o usuario se o servidor estiver mal configurado
      }

      const errorData = await response.json().catch(() => ({}));
      if (isImpersonationErrorCode(errorData.code)) {
        clearImpersonationSession();
      }
      throw new Error(errorData.error || `Erro na API: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error(`Backend indisponível em ${url}: resposta HTML`);
    }

    return response.json();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error;
    }
    if (!options.hideError) {
      toast.error(error.message || 'Erro de comunicação com o servidor.');
    }
    throw error;
  }
};

export const downloadApiFile = async (path: string, filename: string) => {
  const url = getApiUrl(path);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers();
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  for (const [key, value] of Object.entries(getImpersonationHeaders())) {
    headers.set(key, value);
  }

  // Inject BYOB tenant domain
  if (typeof window !== 'undefined') {
    headers.set('x-tenant-domain', window.location.hostname);
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (isImpersonationErrorCode(errorData.code)) {
      clearImpersonationSession();
    }
    throw new Error(
      errorData.error || `Erro ao baixar arquivo: ${response.statusText}`
    );
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
};
