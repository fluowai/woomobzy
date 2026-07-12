import { getRuntimeEnv } from './runtimeConfig';

export const PLATFORM_BRAND_NAME = 'WooTech';
export const PRODUCT_NAME = 'Imob';
export const COMMERCIAL_PRODUCT_NAME = 'WooTech Imob';
export const PLATFORM_TAGLINE = 'CRM imobiliario unificado do ecossistema WooTech.';

export const PANEL_URL = getRuntimeEnv('VITE_PANEL_URL', 'https://imob.wootech.com.br').replace(/\/$/, '');
export const PUBLIC_APP_URL = getRuntimeEnv('VITE_PUBLIC_APP_URL', PANEL_URL).replace(/\/$/, '');
export const PLATFORM_IP = getRuntimeEnv('VITE_PLATFORM_IP', '207.58.153.219');

export const PANEL_HOST = extractHostname(PANEL_URL);
export const PUBLIC_APP_HOST = extractHostname(PUBLIC_APP_URL);

export const LEGACY_PANEL_HOSTS = [
  'app.imobfluow.com.br',
  'imobfluow.consultio.com.br',
];

export const LEGACY_PUBLIC_HOSTS = [
  'imobfluow.com.br',
  'www.imobfluow.com.br',
];

export function getAllPlatformHosts() {
  return Array.from(
    new Set(
      [PANEL_HOST, PUBLIC_APP_HOST, ...LEGACY_PANEL_HOSTS, ...LEGACY_PUBLIC_HOSTS]
        .filter(Boolean)
        .map(normalizeHost)
    )
  );
}

export function isPlatformHost(hostname: string) {
  const host = normalizeHost(hostname);
  return host === 'localhost' || host === '127.0.0.1' || getAllPlatformHosts().includes(host);
}

function extractHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return normalizeHost(url);
  }
}

function normalizeHost(host: string) {
  return String(host || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/:\d+$/, '').replace(/^www\./, '');
}
