/**
 * server/utils/geoUtils.js
 * 
 * Utilitários para processamento de coordenadas e integração com serviços de geolocalização.
 */

import axios from 'axios';

/**
 * Extrai latitude e longitude de diferentes formatos de URL do Google Maps.
 */
export async function extractLatLngFromGoogleMapsUrl(url) {
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
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,                // @lat,lng
    /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,           // q=lat,lng
    /[?&]query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,       // query=lat,lng
    /[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,          // ll=lat,lng
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,           // !3dlat!4dlng (interno do maps)
    /place\/.*?\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/     // place/.../@lat,lng
  ];

  console.log('[GeoUtils] Decoding URL:', decoded);

  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match) {
      const lat = Number(match[1]);
      const lng = Number(match[2]);

      console.log(`[GeoUtils] Found coordinates: ${lat}, ${lng} with pattern ${pattern}`);

      // Validação básica de coordenadas no Brasil (Aumentada para ser mais permissiva na extração)
      if (lat >= -35 && lat <= 6 && lng >= -75 && lng <= -30) {
        return { lat, lng };
      } else {
        console.warn(`[GeoUtils] Coordinates ${lat}, ${lng} out of Brazil bounds.`);
      }
    }
  }

  console.warn('[GeoUtils] No coordinate pattern matched in URL.');
  return null;
}

/**
 * Realiza reverse geocoding via Nominatim (OSM) para descobrir UF e Município.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'ImobzyRural360/1.0 (paulo@imobzy.com.br)'
      },
      timeout: 5000
    });

    if (response.data && response.data.address) {
      const addr = response.data.address;
      return {
        uf: addr['ISO3166-2-lvl4']?.split('-')[1] || addr.state_code || null,
        state: addr.state || null,
        municipality: addr.city || addr.town || addr.village || addr.municipality || null,
        confidence: 'media'
      };
    }
  } catch (e) {
    console.error('[GeoUtils] Erro no reverse geocoding:', e.message);
  }

  return null;
}

/**
 * Calcula a confiança do match com base nos resultados e modo de busca.
 */
export function calculateConfidence(matches, matchMode, ufMatch) {
  if (!matches || matches.length === 0) return 'nenhuma';

  if (matchMode === 'contains_point') {
    if (matches.length === 1 && ufMatch) return 'alta';
    return 'media';
  }

  if (matchMode === 'nearby_radius') {
    const minDistance = Math.min(...matches.map(m => m.distanceMeters || 99999));
    if (minDistance < 500) return 'media';
    return 'baixa';
  }

  return 'baixa';
}
