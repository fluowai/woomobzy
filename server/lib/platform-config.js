function normalizeHost(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/:\d+$/, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');
}

function extractHost(url, fallback = '') {
  try {
    return normalizeHost(new URL(url).hostname);
  } catch {
    return normalizeHost(url || fallback);
  }
}

export const PLATFORM_BRAND_NAME = process.env.PLATFORM_BRAND_NAME || 'WooTech';
export const PLATFORM_PRODUCT_NAME =
  process.env.PLATFORM_PRODUCT_NAME || 'Imob';
export const PLATFORM_COMMERCIAL_NAME =
  process.env.PLATFORM_COMMERCIAL_NAME ||
  `${PLATFORM_BRAND_NAME} ${PLATFORM_PRODUCT_NAME}`;
export const PANEL_URL = (
  process.env.APP_URL ||
  process.env.VITE_PANEL_URL ||
  'https://imob.wootech.com.br'
).replace(/\/$/, '');
export const PUBLIC_APP_URL = (
  process.env.PUBLIC_APP_URL ||
  process.env.VITE_PUBLIC_APP_URL ||
  PANEL_URL
).replace(/\/$/, '');
export const PANEL_HOST = extractHost(PANEL_URL);
export const PUBLIC_APP_HOST = extractHost(PUBLIC_APP_URL);
export const WHM_MAIN_DOMAIN = process.env.WHM_MAIN_DOMAIN || 'wootech.com.br';

export const LEGACY_PANEL_HOSTS = [
  'app.imobfluow.com.br',
  'imobfluow.consultio.com.br',
];

export const LEGACY_PUBLIC_HOSTS = ['imobfluow.com.br', 'www.imobfluow.com.br'];

export function getAllPlatformHosts() {
  return Array.from(
    new Set(
      [
        PANEL_HOST,
        PUBLIC_APP_HOST,
        ...LEGACY_PANEL_HOSTS,
        ...LEGACY_PUBLIC_HOSTS,
      ]
        .filter(Boolean)
        .map(normalizeHost)
    )
  );
}

export function getPlatformOriginList() {
  return Array.from(
    new Set(
      [
        PANEL_URL,
        PUBLIC_APP_URL,
        ...LEGACY_PANEL_HOSTS.map((host) => `https://${host}`),
        ...LEGACY_PUBLIC_HOSTS.map((host) => `https://${host}`),
      ]
        .filter(Boolean)
        .map((value) => String(value).replace(/\/$/, ''))
    )
  );
}

export function isPlatformHost(hostname) {
  const host = normalizeHost(hostname);
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    getAllPlatformHosts().includes(host)
  );
}
