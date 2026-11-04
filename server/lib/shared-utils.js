/**
 * Shared utility functions for server API modules.
 * Extracted to eliminate duplication across route files.
 */

/**
 * Sanitize user input: strip non-word chars (except - and .), truncate.
 */
export function sanitizeInput(input, maxLength = 50) {
  if (typeof input !== 'string') return '';
  return input.replace(/[^\w\-.]/g, '').slice(0, maxLength);
}

/**
 * Validate a UUID v4 string (case-insensitive).
 */
export function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id
  );
}

/**
 * Normalize a Brazilian phone number to digits-only with country code.
 * Removes non-digits, strips leading zeros, prepends 55 if local format.
 */
export function normalizePhone(value = '') {
  let digits = String(value).replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

/**
 * Validate a Brazilian individual phone (not group, starts with 55, 12-13 digits).
 */
export function isValidBRPhone(value = '') {
  const phone = normalizePhone(value);
  return phone.startsWith('55') && (phone.length === 12 || phone.length === 13);
}

/**
 * Check if a WhatsApp JID is a group chat.
 */
export function isGroupChatJid(value = '') {
  return String(value).includes('@g.us');
}

/**
 * Validate CPF or CNPJ by format (not checksum).
 */
export function validateCPF_CNPJ(cpfCnpj) {
  const cleaned = String(cpfCnpj).replace(/\D/g, '');
  return cleaned.length >= 11 && cleaned.length <= 14;
}

/**
 * Collect bounding box from nested GeoJSON coordinate arrays.
 */
export function collectCoordinateBounds(
  coordinates,
  bounds = {
    minLat: Infinity,
    minLng: Infinity,
    maxLat: -Infinity,
    maxLng: -Infinity,
  }
) {
  if (!Array.isArray(coordinates)) return bounds;

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === 'number' &&
    typeof coordinates[1] === 'number'
  ) {
    const [lng, lat] = coordinates;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      bounds.minLat = Math.min(bounds.minLat, lat);
      bounds.maxLat = Math.max(bounds.maxLat, lat);
      bounds.minLng = Math.min(bounds.minLng, lng);
      bounds.maxLng = Math.max(bounds.maxLng, lng);
    }
    return bounds;
  }

  for (const item of coordinates) {
    collectCoordinateBounds(item, bounds);
  }
  return bounds;
}

/**
 * Convert a GeoJSON FeatureCollection to a map-compatible target object.
 */
export function featureCollectionToMapTarget(featureCollection) {
  const features = featureCollection?.features || [];
  if (!features.length) return null;

  let bounds = {
    minLat: Infinity,
    minLng: Infinity,
    maxLat: -Infinity,
    maxLng: -Infinity,
  };
  let totalAreaHa = 0;

  for (const feature of features) {
    if (feature.geometry?.coordinates) {
      bounds = collectCoordinateBounds(feature.geometry.coordinates, bounds);
    }
    if (feature.properties?.area_ha) {
      totalAreaHa += feature.properties.area_ha;
    }
  }

  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLng = (bounds.minLng + bounds.maxLng) / 2;

  return {
    center: [centerLat, centerLng],
    bounds: [
      [bounds.minLat, bounds.minLng],
      [bounds.maxLat, bounds.maxLng],
    ],
    totalAreaHa: Math.round(totalAreaHa * 100) / 100,
    featureCount: features.length,
  };
}

/**
 * Extract UF (state) from a rural property code like "MT-XXX".
 */
export function extractUfFromRuralCode(code) {
  const match = String(code || '')
    .trim()
    .match(/^([A-Z]{2})[-_]/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Extract readable exception text from a GeoServer XML response.
 */
export function extractGeoServerException(rawText) {
  const text = String(rawText || '');
  const exceptionText =
    text.match(/<ows:ExceptionText[^>]*>([\s\S]*?)<\/ows:ExceptionText>/i) ||
    text.match(/<ExceptionText[^>]*>([\s\S]*?)<\/ExceptionText>/i);
  if (exceptionText?.[1]) {
    return exceptionText[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

/**
 * Check if a lead name is a placeholder (empty, initials-only, or just a phone number).
 */
export function isPlaceholderLeadName(value = '') {
  const clean = String(value).trim().toLowerCase();
  if (
    !clean ||
    clean === '~' ||
    clean === 'me' ||
    clean === 'contato sem telefone'
  )
    return true;
  const raw = String(value).trim();
  if (/^([A-Z]\.?\s*){1,4}$/.test(raw) || /^([A-Za-z]\.\s*){1,4}$/.test(raw))
    return true;
  return /^\+?\d{8,15}$/.test(clean.replace(/\s/g, ''));
}

/**
 * Resolve a display name from multiple candidates, falling back to phone or default.
 */
export function resolveLeadName(...values) {
  let phoneFallback = '';
  for (const value of values) {
    const clean = String(value || '').trim();
    if (/^\+?\d{8,15}$/.test(clean.replace(/\s/g, ''))) phoneFallback = clean;
    if (!clean || isPlaceholderLeadName(clean)) continue;
    return clean;
  }
  return phoneFallback || 'Lead WhatsApp';
}

/**
 * Get the last 8 digits of a normalized phone for fuzzy search.
 */
export function phoneSearchTail(value = '') {
  const normalized = normalizePhone(value);
  return normalized.length >= 8 ? normalized.slice(-8) : normalized;
}
