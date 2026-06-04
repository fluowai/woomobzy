import { getRuntimeEnv } from './runtimeConfig';

export const BRAND_NAME = 'ImobFluow';
export const PLATFORM_DOMAIN = 'imobfluow.com.br';
export const PLATFORM_BASE_URL = getRuntimeEnv(
  'VITE_PUBLIC_APP_URL',
  `https://${PLATFORM_DOMAIN}`
).replace(/\/$/, '');
export const PLATFORM_IP = getRuntimeEnv('VITE_PLATFORM_IP', '207.58.153.219');

export function getTenantBaseUrl(slug?: string | null) {
  const cleanSlug = String(slug || '').replace(/^\/|\/$/g, '');
  return cleanSlug ? `${PLATFORM_BASE_URL}/${cleanSlug}` : PLATFORM_BASE_URL;
}

export function getTenantSiteUrl(slug?: string | null) {
  return `${getTenantBaseUrl(slug)}/site`;
}
