import {
  COMMERCIAL_PRODUCT_NAME,
  PUBLIC_APP_URL,
} from './branding';

export const BRAND_NAME = COMMERCIAL_PRODUCT_NAME;
export const PLATFORM_IP_UNSET = 'IP indisponível';
export const PLATFORM_DOMAIN = new URL(PUBLIC_APP_URL).hostname;
export const PLATFORM_BASE_URL = PUBLIC_APP_URL;

export function getTenantBaseUrl(slug?: string | null) {
  const cleanSlug = String(slug || '').replace(/^\/|\/$/g, '');
  return cleanSlug ? `${PLATFORM_BASE_URL}/${cleanSlug}` : PLATFORM_BASE_URL;
}

export function getTenantSiteUrl(slug?: string | null) {
  return `${getTenantBaseUrl(slug)}/site`;
}
