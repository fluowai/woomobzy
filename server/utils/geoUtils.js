/**
 * server/utils/geoUtils.js
 *
 * Utilitarios para processamento de coordenadas e integracao com servicos de geolocalizacao.
 */

import axios from 'axios';

const BRAZIL_BOUNDS = {
  minLat: -35,
  maxLat: 6,
  minLng: -75,
  maxLng: -30,
};

function toCoordinate(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value).trim().replace(',', '.');
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isInsideBrazil(lat, lng) {
  return (
    lat >= BRAZIL_BOUNDS.minLat &&
    lat <= BRAZIL_BOUNDS.maxLat &&
    lng >= BRAZIL_BOUNDS.minLng &&
    lng <= BRAZIL_BOUNDS.maxLng
  );
}

function buildCoordinate(latValue, lngValue) {
  const lat = toCoordinate(latValue);
  const lng = toCoordinate(lngValue);

  if (lat === null || lng === null) return null;
  if (!isInsideBrazil(lat, lng)) {
    console.warn(`[GeoUtils] Coordinates ${lat}, ${lng} out of Brazil bounds.`);
    return null;
  }

  return { lat, lng };
}

function extractAddressFromMapsUrl(decodedUrl) {
  const addressParams = ['q', 'query', 'daddr', 'destination'];

  try {
    const normalizedUrl = /^https?:\/\//i.test(decodedUrl)
      ? decodedUrl
      : `https://${decodedUrl}`;
    const parsed = new URL(normalizedUrl);

    for (const param of addressParams) {
      const value = parsed.searchParams.get(param);
      if (value && !buildCoordinateFromText(value)) return value.replace(/\+/g, ' ').trim();
    }
  } catch (e) {
    for (const param of addressParams) {
      const match = decodedUrl.match(new RegExp(`[?&]${param}=([^&]+)`, 'i'));
      if (match?.[1]) {
        const value = match[1].replace(/\+/g, ' ').trim();
        if (value && !buildCoordinateFromText(value)) return value;
      }
    }
  }

  return null;
}

function buildCoordinateFromText(value) {
  const match = String(value).trim().match(/^(-?\d+(?:[\.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[\.,]\d+)?)$/);
  if (!match) return null;
  return buildCoordinate(match[1], match[2]);
}

async function geocodeAddress(address) {
  try {
    const url = 'https://nominatim.openstreetmap.org/search';
    const response = await axios.get(url, {
      params: {
        format: 'json',
        q: address,
        countrycodes: 'br',
        limit: 1,
      },
      headers: {
        'User-Agent': 'Rural360/1.0',
      },
      timeout: 8000,
    });

    const bestMatch = response.data?.[0];
    if (!bestMatch) return null;

    return buildCoordinate(bestMatch.lat, bestMatch.lon);
  } catch (e) {
    console.error('[GeoUtils] Erro no forward geocoding:', e.message);
    return null;
  }
}

/**
 * Extrai latitude e longitude de diferentes formatos de URL do Google Maps.
 */
export async function extractLatLngFromGoogleMapsUrl(url) {
  if (!url || typeof url !== 'string') return null;

  let finalUrl = url;

  // Seguir redirecionamento se for link encurtado (maps.app.goo.gl)
  if (url.includes('maps.app.goo.gl')) {
    try {
      const response = await axios.head(url, { maxRedirects: 5 });
      finalUrl = response.request.res.responseUrl || url;
    } catch (e) {
      console.warn('[GeoUtils] Falha ao seguir redirect do Google Maps:', e.message);
    }
  }

  const decoded = decodeURIComponent(finalUrl);

  const patterns = [
    /^\s*(-?\d+(?:[\.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[\.,]\d+)?)\s*$/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:[\.,]\d+)?),(-?\d+(?:[\.,]\d+)?)/,
    /[?&]query=(-?\d+(?:[\.,]\d+)?),(-?\d+(?:[\.,]\d+)?)/,
    /[?&]ll=(-?\d+(?:[\.,]\d+)?),(-?\d+(?:[\.,]\d+)?)/,
    /[?&]lat=(-?\d+(?:[\.,]\d+)?).*?[?&]lng=(-?\d+(?:[\.,]\d+)?)/,
    /[?&]latitude=(-?\d+(?:[\.,]\d+)?).*?[?&]longitude=(-?\d+(?:[\.,]\d+)?)/,
    /!3d(-?\d+(?:[\.,]\d+)?)!4d(-?\d+(?:[\.,]\d+)?)/,
    /place\/.*?\/@(-?\d+(?:[\.,]\d+)?),(-?\d+(?:[\.,]\d+)?)/,
  ];

  console.log('[GeoUtils] Decoding URL:', decoded);

  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (!match) continue;

    const coords = buildCoordinate(match[1], match[2]);
    if (!coords) continue;

    console.log(`[GeoUtils] Found coordinates: ${coords.lat}, ${coords.lng} with pattern ${pattern}`);
    return coords;
  }

  const address = extractAddressFromMapsUrl(decoded);
  if (address) {
    console.log('[GeoUtils] Trying address geocoding:', address);
    const coords = await geocodeAddress(address);
    if (coords) {
      console.log(`[GeoUtils] Found coordinates by address: ${coords.lat}, ${coords.lng}`);
      return coords;
    }
  }

  console.warn('[GeoUtils] No coordinate pattern matched in URL.');
  return null;
}

/**
 * Realiza reverse geocoding via Nominatim (OSM) para descobrir UF e Municipio.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Rural360/1.0',
      },
      timeout: 5000,
    });

    if (response.data && response.data.address) {
      const addr = response.data.address;
      return {
        uf: addr['ISO3166-2-lvl4']?.split('-')[1] || addr.state_code || null,
        state: addr.state || null,
        municipality: addr.city || addr.town || addr.village || addr.municipality || null,
        confidence: 'media',
      };
    }
  } catch (e) {
    console.error('[GeoUtils] Erro no reverse geocoding:', e.message);
  }

  return null;
}

/**
 * Calcula a confianca do match com base nos resultados e modo de busca.
 */
export function calculateConfidence(matches, matchMode, ufMatch) {
  if (!matches || matches.length === 0) return 'nenhuma';

  if (matchMode === 'contains_point') {
    if (matches.length === 1 && ufMatch) return 'alta';
    return 'media';
  }

  if (matchMode === 'nearby_radius') {
    const minDistance = Math.min(...matches.map((m) => m.distanceMeters || 99999));
    if (minDistance < 500) return 'media';
    return 'baixa';
  }

  return 'baixa';
}
