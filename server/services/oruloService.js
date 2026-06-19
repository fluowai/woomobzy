import { enrichPropertyWithAcp } from './acpPropertyAgent.js';

const ORULO_API_BASE_URL = 'https://www.orulo.com.br';
const ORULO_TOKEN_URL = `${ORULO_API_BASE_URL}/oauth/token`;
const ORULO_AUTHORIZE_URL = `${ORULO_API_BASE_URL}/oauth/authorize`;
const DEFAULT_IMAGE_DIMENSIONS = ['1024x1024', '520x280'];
const RURAL_ORULO_TYPES = new Set(['Fazenda/Sítio', 'Fazenda', 'Sítio', 'Chácara']);

const ARRAY_FILTER_KEYS = new Set([
  'area',
  'area[]',
  'bedrooms',
  'bedrooms[]',
  'parking',
  'parking[]',
  'suites',
  'suites[]',
  'type',
  'type[]',
  'status',
  'status[]',
  'portfolio',
  'portfolio[]',
  'opportunity',
  'opportunity[]',
  'commercial_status',
  'commercial_status[]',
  'finality',
  'finality[]',
  'include',
  'include[]',
  'building_ids',
  'building_ids[]',
]);
const ALLOWED_BUILDING_FILTERS = new Set([
  'state',
  'city',
  'area',
  'area[]',
  'bedrooms',
  'bedrooms[]',
  'suites',
  'suites[]',
  'parking',
  'parking[]',
  'type',
  'type[]',
  'status',
  'status[]',
  'portfolio',
  'portfolio[]',
  'opportunity',
  'opportunity[]',
  'commercial_status',
  'commercial_status[]',
  'finality',
  'finality[]',
  'min_price',
  'max_price',
  'min_private_area',
  'max_private_area',
  'min_price_per_private_square_meter',
  'max_price_per_private_square_meter',
  'developer_id',
  'publisher_id',
  'commercial_partner_id',
  'updated_after',
  'price_order',
  'area_order',
  'relevancy_order',
  'last_updated_date_order',
  'launch_date_order',
  'building_id_order',
  'price_per_private_square_meter_order',
  'include',
  'include[]',
]);

const tokenCacheByClient = new Map();

function normalizeCredentials(credentials = {}) {
  const useProvidedCredentials = Object.keys(credentials || {}).length > 0;
  const clientId = (useProvidedCredentials ? credentials.clientId : process.env.ORULO_CLIENT_ID || '').trim();
  const clientSecret = (useProvidedCredentials ? credentials.clientSecret : process.env.ORULO_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    const error = new Error('Credenciais da Órulo não configuradas no servidor.');
    error.statusCode = 400;
    throw error;
  }

  return { clientId, clientSecret };
}

async function getClientToken({ credentials, forceRefresh = false } = {}) {
  const { clientId, clientSecret } = normalizeCredentials(credentials);
  const cacheKey = `${clientId}:${clientSecret.slice(-8)}`;
  const cached = tokenCacheByClient.get(cacheKey);

  if (!forceRefresh && cached?.accessToken && cached.expiresAt > Date.now() + 60000) {
    return cached.accessToken;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  });

  const response = await fetch(ORULO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`Falha ao autenticar na Órulo (${response.status}).`);
    error.detail = detail;
    error.statusCode = response.status === 401 ? 401 : 502;
    throw error;
  }

  const data = await response.json();
  tokenCacheByClient.set(cacheKey, {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
  });

  return data.access_token;
}

function appendQuery(url, query = {}) {
  Object.entries(query || {}).forEach(([rawKey, value]) => {
    const key = ARRAY_FILTER_KEYS.has(rawKey) && !rawKey.endsWith('[]') ? `${rawKey}[]` : rawKey;
    if (Array.isArray(value)) {
      value
        .filter((item) => item !== undefined && item !== null && item !== '')
        .forEach((item) => url.searchParams.append(key, String(item)));
    } else if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
}

async function oruloRequest(path, { credentials, query, retry = true, token, method = 'GET', body } = {}) {
  const accessToken = token || await getClientToken({ credentials });
  const url = new URL(path, ORULO_API_BASE_URL);
  appendQuery(url, query);

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && retry && !token) {
    await getClientToken({ credentials, forceRefresh: true });
    return oruloRequest(path, { credentials, query, retry: false, method, body });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`Erro na API Órulo (${response.status}) em ${path}.`);
    error.detail = detail;
    error.statusCode = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  if (response.status === 204) return {};
  return response.json().catch(() => ({}));
}

function sanitizeBuildingFilters(filters = {}) {
  const query = {};

  Object.entries(filters || {}).forEach(([key, value]) => {
    if (!ALLOWED_BUILDING_FILTERS.has(key)) return;
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value) && value.length === 0) return;
    query[key] = value;
  });

  return query;
}

function hasCatalogFilters(filters = {}) {
  return Object.keys(sanitizeBuildingFilters(filters)).length > 0;
}

export function buildEndUserAuthorizationUrl({ credentials, redirectUri, state }) {
  const { clientId } = normalizeCredentials(credentials);
  const url = new URL(ORULO_AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  if (state) url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeEndUserCode({ credentials, code, redirectUri }) {
  const { clientId, clientSecret } = normalizeCredentials(credentials);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(ORULO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`Falha ao conectar corretor na Ã“rulo (${response.status}).`);
    error.detail = detail;
    error.statusCode = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    tokenType: data.token_type || 'Bearer',
    expiresAt: new Date(Date.now() + Number(data.expires_in || 3600) * 1000).toISOString(),
    connectedAt: new Date().toISOString(),
  };
}

export async function refreshEndUserToken({ credentials, refreshToken }) {
  if (!refreshToken) {
    const error = new Error('A autorização Órulo do corretor expirou. Conecte a conta novamente.');
    error.statusCode = 401;
    throw error;
  }

  const { clientId, clientSecret } = normalizeCredentials(credentials);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(ORULO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const error = new Error('Não foi possível renovar a autorização Órulo do corretor.');
    error.statusCode = 401;
    throw error;
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    tokenType: data.token_type || 'Bearer',
    expiresAt: new Date(Date.now() + Number(data.expires_in || 3600) * 1000).toISOString(),
    connectedAt: new Date().toISOString(),
  };
}

export async function fetchEndUserProtectedResource({ token, resource }) {
  if (!token) {
    const error = new Error('Corretor ainda nÃ£o conectou a conta Ã“rulo.');
    error.statusCode = 401;
    throw error;
  }

  const allowList = [
    /^\/api\/v2\/buildings\/[^/]+$/,
    /^\/api\/v2\/buildings\/[^/]+\/commercial_contacts\/[^/]+$/,
    /^\/api\/v2\/buildings\/[^/]+\/files\/[^/]+$/,
    /^\/api\/v2\/buildings\/[^/]+\/units$/,
    /^\/api\/v2\/buildings\/[^/]+\/typologies\/[^/]+\/units$/,
  ];

  if (!allowList.some((pattern) => pattern.test(resource))) {
    const error = new Error('Recurso Ã“rulo protegido nÃ£o permitido.');
    error.statusCode = 400;
    throw error;
  }

  return oruloRequest(resource, { token, retry: false });
}

function buildAddress(address = {}) {
  return [address.street_type, address.street, address.number].filter(Boolean).join(' ');
}

function mapPropertyType(type) {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('studio')) return 'Studio';
  if (normalized.includes('loft')) return 'Loft';
  if (normalized.includes('cobertura')) return 'Cobertura';
  if (normalized.includes('casa')) return 'Casa';
  if (normalized.includes('terreno') || normalized.includes('lote')) return 'Terreno Urbano';
  if (normalized.includes('sala') || normalized.includes('loja')) return 'Sala Comercial';
  if (normalized.includes('galp')) return 'Galpão Industrial';
  return 'Apartamento';
}

function money(value) {
  const numeric = Number(value || 0);
  return numeric > 0 ? numeric : 0;
}

function pickImages(imagesResponse) {
  return (imagesResponse?.images || [])
    .map((image) => image['1024x1024'] || image['520x280'] || image.url)
    .filter(Boolean);
}

function buildDescription(building, typology) {
  const address = building.address || {};
  const parts = [
    building.description,
    `${typology.type || 'Imóvel'} no empreendimento ${building.name}.`,
    address.area || address.city
      ? `Localização: ${[address.area, address.city, address.state].filter(Boolean).join(', ')}.`
      : null,
    building.stage || building.status ? `Status do empreendimento: ${building.stage || building.status}.` : null,
    typology.private_area ? `Área privativa a partir de ${typology.private_area} m².` : null,
  ];

  return parts.filter(Boolean).join('\n\n');
}

function mapTypologyToProperty({ building, typology, images, organizationId }) {
  const address = building.address || {};
  const price = money(typology.discount_price || typology.original_price || typology.price || building.min_price);
  const externalId = `${building.id}:${typology.id}`;
  const bedrooms = Number(typology.bedrooms ?? building.min_bedrooms ?? 0) || 0;
  const suites = Number(typology.suites ?? building.min_suites ?? 0) || 0;
  const bathrooms = Number(typology.bathrooms ?? building.min_bathrooms ?? 0) || 0;
  const parking = Number(typology.parking ?? typology.parking_spaces ?? building.min_parking ?? 0) || 0;
  const areaM2 = Number(typology.private_area ?? building.min_area ?? 0) || 0;

  return {
    organization_id: organizationId,
    source: 'orulo',
    external_id: externalId,
    external_updated_at: building.updated_at || typology.updated_at || null,
    external_listing_status: building.status || building.stage || 'active',
    imported_at: new Date().toISOString(),
    niche: 'urbano',
    status: 'Pendente',
    title: [mapPropertyType(typology.type), building.name, bedrooms ? `${bedrooms} dorm.` : null]
      .filter(Boolean)
      .join(' - '),
    description: buildDescription(building, typology),
    price,
    property_type: mapPropertyType(typology.type),
    purpose: 'Venda',
    city: address.city || null,
    state: address.state || null,
    neighborhood: address.area || null,
    address: buildAddress(address) || null,
    images,
    features: {
      areaM2,
      areaConstruida: areaM2,
      dormitorios: bedrooms,
      suites,
      banheiros: bathrooms,
      vagas: parking,
      orulo: {
        building_id: String(building.id),
        typology_id: String(typology.id),
        building_name: building.name,
        developer: building.developer?.name || null,
        publisher: building.publisher?.name || null,
        stage: building.stage || null,
        status: building.status || null,
        latitude: address.latitude || null,
        longitude: address.longitude || null,
      },
    },
  };
}

async function fetchBuildingBundle(buildingId, credentials) {
  const [building, typologiesResponse, imagesResponse, floorPlansResponse] = await Promise.all([
    oruloRequest(`/api/v2/buildings/${buildingId}`, { credentials }),
    oruloRequest(`/api/v2/buildings/${buildingId}/typologies`, { credentials }),
    oruloRequest(`/api/v2/buildings/${buildingId}/images`, {
      credentials,
      query: { 'dimensions[]': DEFAULT_IMAGE_DIMENSIONS },
    }).catch(() => ({ images: [] })),
    oruloRequest(`/api/v2/buildings/${buildingId}/floor_plans`, {
      credentials,
      query: { 'dimensions[]': DEFAULT_IMAGE_DIMENSIONS },
    }).catch(() => ({ floor_plans: [] })),
  ]);

  return {
    building,
    typologies: typologiesResponse?.typologies || [],
    images: pickImages(imagesResponse),
    floorPlans: floorPlansResponse?.floor_plans || [],
  };
}

export async function importBuildingTypologies({ supabase, organizationId, buildingId, credentials }) {
  const { building, typologies, images, floorPlans } = await fetchBuildingBundle(buildingId, credentials);
  const urbanTypologies = typologies.filter((typology) => !RURAL_ORULO_TYPES.has(typology.type));

  if (!urbanTypologies.length) {
    return { buildingId, imported: 0, skipped: typologies.length, properties: [] };
  }

  const payload = [];

  for (const typology of urbanTypologies) {
    const property = mapTypologyToProperty({ building, typology, images, organizationId });
    property.features.orulo.floor_plans = floorPlans;
    payload.push(await enrichPropertyWithAcp({ supabase, organizationId, property }));
  }

  const data = await saveOruloProperties(supabase, payload);

  return {
    buildingId,
    imported: data?.length || 0,
    skipped: typologies.length - urbanTypologies.length,
    properties: data || [],
  };
}

async function saveOruloProperties(supabase, properties) {
  const saved = [];

  for (const property of properties) {
    const { data: existing, error: existingError } = await supabase
      .from('properties')
      .select('id, status')
      .eq('organization_id', property.organization_id)
      .eq('source', property.source)
      .eq('external_id', property.external_id)
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing?.id) {
      const updatePayload = { ...property };
      delete updatePayload.organization_id;
      delete updatePayload.status;

      const { data, error } = await supabase
        .from('properties')
        .update(updatePayload)
        .eq('id', existing.id)
        .select('id, title, status, external_id')
        .single();

      if (error) throw error;
      saved.push(data);
      continue;
    }

    const { data, error } = await supabase
      .from('properties')
      .insert(property)
      .select('id, title, status, external_id')
      .single();

    if (error) throw error;
    saved.push(data);
  }

  return saved;
}

export async function syncActiveBuildings({ supabase, organizationId, updatedAfter, maxBuildings = 25, credentials }) {
  let page = 1;
  let processed = 0;
  const results = [];

  while (processed < maxBuildings) {
    const response = await oruloRequest('/api/v2/buildings/ids/active', {
      credentials,
      query: {
        updated_after: updatedAfter,
        results_per_page: Math.min(500, Math.max(1, maxBuildings - processed)),
        page,
      },
    });

    const buildings = response?.buildings || [];
    if (!buildings.length) break;

    for (const building of buildings) {
      if (processed >= maxBuildings) break;
      const result = await importBuildingTypologies({
        supabase,
        organizationId,
        buildingId: building.id,
        credentials,
      });
      results.push(result);
      processed += 1;
    }

    if (!response.total_pages || page >= response.total_pages) break;
    page += 1;
  }

  return {
    processed,
    imported: results.reduce((sum, item) => sum + item.imported, 0),
    skipped: results.reduce((sum, item) => sum + item.skipped, 0),
    results,
  };
}

export async function syncBuildingsByFilters({ supabase, organizationId, filters = {}, maxBuildings = 25, credentials }) {
  let page = 1;
  let processed = 0;
  const results = [];
  const query = sanitizeBuildingFilters(filters);

  while (processed < maxBuildings) {
    const response = await oruloRequest('/api/v2/buildings', {
      credentials,
      query: {
        ...query,
        results_per_page: Math.min(100, Math.max(1, maxBuildings - processed)),
        page,
      },
    });

    const buildings = response?.buildings || [];
    if (!buildings.length) break;

    for (const building of buildings) {
      if (processed >= maxBuildings) break;
      const result = await importBuildingTypologies({
        supabase,
        organizationId,
        buildingId: building.id,
        credentials,
      });
      results.push(result);
      processed += 1;
    }

    if (!response.total_pages || page >= response.total_pages) break;
    page += 1;
  }

  return {
    mode: 'filters',
    processed,
    imported: results.reduce((sum, item) => sum + item.imported, 0),
    skipped: results.reduce((sum, item) => sum + item.skipped, 0),
    results,
  };
}

export async function listOruloMetadata({ type, credentials, query = {} }) {
  const paths = {
    states: '/api/v2/addresses/states',
    cities: '/api/v2/addresses/cities',
    areas: '/api/v2/addresses/areas',
    features: '/api/v2/features',
    types: '/api/v2/types',
    partners: '/api/v2/partners',
    config: '/api/v2/config',
  };

  const path = paths[type];
  if (!path) {
    const error = new Error('Metadado Ã“rulo nÃ£o suportado.');
    error.statusCode = 400;
    throw error;
  }

  return oruloRequest(path, { credentials, query });
}

export async function updatePublicationLinks({ credentials, buildingId, publicationLinks }) {
  return oruloRequest(`/api/v2/buildings/${buildingId}/publication_links`, {
    credentials,
    method: 'PUT',
    body: {
      publication_links: Array.isArray(publicationLinks) ? publicationLinks : [],
    },
  });
}

export async function markRemovedBuildings({ supabase, organizationId, updatedAfter, credentials }) {
  const response = await oruloRequest('/api/v2/buildings/ids/removed', {
    credentials,
    query: { updated_after: updatedAfter, results_per_page: 500, page: 1 },
  });
  const removed = response?.buildings || [];

  for (const building of removed) {
    await supabase
      .from('properties')
      .update({
        status: 'Vendido',
        external_listing_status: building.reason || 'removed',
      })
      .eq('organization_id', organizationId)
      .eq('source', 'orulo')
      .like('external_id', `${building.id}:%`);
  }

  return { removed: removed.length };
}

export async function markBuildingRemovedById({ supabase, organizationId, buildingId, reason = 'removed' }) {
  if (!buildingId) return { removed: 0 };

  const { error, count } = await supabase
    .from('properties')
    .update({
      status: 'Vendido',
      external_listing_status: reason,
    })
    .eq('organization_id', organizationId)
    .eq('source', 'orulo')
    .like('external_id', `${buildingId}:%`);

  if (error) throw error;
  return { removed: count || 0 };
}

export function isOruloConfigured(credentials) {
  try {
    normalizeCredentials(credentials);
    return true;
  } catch {
    return false;
  }
}

export { hasCatalogFilters, sanitizeBuildingFilters };
