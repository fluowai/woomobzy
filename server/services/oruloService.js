const ORULO_API_BASE_URL = 'https://www.orulo.com.br';
const ORULO_TOKEN_URL = `${ORULO_API_BASE_URL}/oauth/token`;
const DEFAULT_IMAGE_DIMENSIONS = ['1024x1024', '520x280'];
const RURAL_ORULO_TYPES = new Set(['Fazenda/Sítio', 'Fazenda', 'Sítio', 'Chácara']);

let tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

function getCredentials() {
  const clientId = process.env.ORULO_CLIENT_ID?.trim();
  const clientSecret = process.env.ORULO_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    const error = new Error('Credenciais da Órulo não configuradas no servidor.');
    error.statusCode = 400;
    throw error;
  }

  return { clientId, clientSecret };
}

async function getClientToken({ forceRefresh = false } = {}) {
  if (!forceRefresh && tokenCache.accessToken && tokenCache.expiresAt > Date.now() + 60000) {
    return tokenCache.accessToken;
  }

  const { clientId, clientSecret } = getCredentials();
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
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
  };

  return tokenCache.accessToken;
}

async function oruloRequest(path, { query, retry = true } = {}) {
  const token = await getClientToken();
  const url = new URL(path, ORULO_API_BASE_URL);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item));
    } else if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 && retry) {
    await getClientToken({ forceRefresh: true });
    return oruloRequest(path, { query, retry: false });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`Erro na API Órulo (${response.status}) em ${path}.`);
    error.detail = detail;
    error.statusCode = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  return response.json();
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

async function fetchBuildingBundle(buildingId) {
  const [building, typologiesResponse, imagesResponse] = await Promise.all([
    oruloRequest(`/api/v2/buildings/${buildingId}`),
    oruloRequest(`/api/v2/buildings/${buildingId}/typologies`),
    oruloRequest(`/api/v2/buildings/${buildingId}/images`, {
      query: { 'dimensions[]': DEFAULT_IMAGE_DIMENSIONS },
    }).catch(() => ({ images: [] })),
  ]);

  return {
    building,
    typologies: typologiesResponse?.typologies || [],
    images: pickImages(imagesResponse),
  };
}

export async function importBuildingTypologies({ supabase, organizationId, buildingId }) {
  const { building, typologies, images } = await fetchBuildingBundle(buildingId);
  const urbanTypologies = typologies.filter((typology) => !RURAL_ORULO_TYPES.has(typology.type));

  if (!urbanTypologies.length) {
    return { buildingId, imported: 0, skipped: typologies.length, properties: [] };
  }

  const payload = urbanTypologies.map((typology) =>
    mapTypologyToProperty({ building, typology, images, organizationId })
  );

  const { data, error } = await supabase
    .from('properties')
    .upsert(payload, { onConflict: 'organization_id,source,external_id' })
    .select('id, title, status, external_id');

  if (error) throw error;

  return {
    buildingId,
    imported: data?.length || 0,
    skipped: typologies.length - urbanTypologies.length,
    properties: data || [],
  };
}

export async function syncActiveBuildings({ supabase, organizationId, updatedAfter, maxBuildings = 25 }) {
  let page = 1;
  let processed = 0;
  const results = [];

  while (processed < maxBuildings) {
    const response = await oruloRequest('/api/v2/buildings/ids/active', {
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

export async function markRemovedBuildings({ supabase, organizationId, updatedAfter }) {
  const response = await oruloRequest('/api/v2/buildings/ids/removed', {
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

export function isOruloConfigured() {
  return Boolean(process.env.ORULO_CLIENT_ID?.trim() && process.env.ORULO_CLIENT_SECRET?.trim());
}
