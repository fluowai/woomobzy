const ZAP_API_BASE = 'https://api.zapimoveis.com.br/api/v1';

function buildHeaders(config) {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': config.apiKey,
    ...(config.partnerId ? { 'X-Partner-Id': config.partnerId } : {}),
  };
}

function mapPropertyToZapPayload(property) {
  const loc = property.location || {};
  const features = property.features || {};
  const images = (property.images || []).map((url, idx) => ({
    url,
    order: idx,
    caption: `${property.title} - Foto ${idx + 1}`,
  }));

  return {
    listing: {
      external_id: property.id,
      title: property.title,
      description: property.description || '',
      transaction: property.purpose === 'Aluguel' ? 'rent' : 'sale',
      price: property.price,
      condominium_fee: null,
      iptu: null,
      property_type: mapType(property.property_type || property.type),
      size: {
        private_area: features.areaM2 || features.areaConstruida || 0,
        total_area: features.areaTotal || 0,
        unit: 'm²',
      },
      bedrooms: features.dormitorios || 0,
      bathrooms: features.banheiros || 0,
      parking_spaces: features.vagas || 0,
      suites: features.suites || 0,
      address: {
        city: loc.city || property.city || '',
        state: loc.state || property.state || '',
        neighborhood: loc.neighborhood || property.neighborhood || '',
        street: loc.address || property.address || '',
        zipcode: features.cep || '',
      },
      images,
      features: extractAmenities(features),
      broker: {
        name: features.broker_name || '',
        creci: features.broker_creci || '',
        phone: features.broker_phone || '',
      },
    },
  };
}

function mapType(type) {
  const map = {
    Apartamento: 'apartment',
    Casa: 'house',
    Sobrado: 'townhouse',
    'Terreno Urbano': 'land',
    'Sala Comercial': 'commercial',
    'Galpão Industrial': 'warehouse',
    Loft: 'loft',
    Studio: 'studio',
    Cobertura: 'penthouse',
    Flat: 'flat',
    Kitnet: 'kitnet',
  };
  return map[type] || 'other';
}

function extractAmenities(features) {
  const list = [];
  if (features.piscina) list.push('pool');
  if (features.academia) list.push('gym');
  if (features.varanda) list.push('balcony');
  if (features.churrasqueira) list.push('barbecue');
  if (features.portaria) list.push('concierge');
  if (features.elevador) list.push('elevator');
  if (features.seguranca) list.push('security');
  if (features.estacionamento) list.push('parking');
  if (features.areaLazer) list.push('leisure_area');
  if (features.quadra) list.push('sports_court');
  if (features.salaoFestas) list.push('party_room');
  if (features.playground) list.push('playground');
  if (features.sacada) list.push('balcony');
  return list;
}

async function zapRequest(path, { config, method = 'GET', body } = {}) {
  const url = new URL(path, ZAP_API_BASE);
  const response = await fetch(url, {
    method,
    headers: buildHeaders(config),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(
      `Erro na API Zap Imóveis (${response.status}): ${detail}`
    );
    error.statusCode = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  if (response.status === 204) return {};
  return response.json().catch(() => ({}));
}

export const zapService = {
  async publish(property, config) {
    const payload = mapPropertyToZapPayload(property);
    const data = await zapRequest('/listings', {
      config,
      method: 'POST',
      body: payload,
    });
    return {
      listingId: data.listing?.id || data.id,
      url: data.listing?.url || null,
    };
  },

  async update(property, config) {
    const publishes = property.portal_publishes || {};
    const entry = publishes.zap;
    if (!entry?.listingId) {
      return this.publish(property, config);
    }
    const payload = mapPropertyToZapPayload(property);
    await zapRequest(`/listings/${entry.listingId}`, {
      config,
      method: 'PUT',
      body: payload,
    });
    return { listingId: entry.listingId, url: entry.url };
  },

  async unpublish(listingId, config) {
    await zapRequest(`/listings/${listingId}`, {
      config,
      method: 'DELETE',
    });
  },

  async status(listingId, config) {
    const data = await zapRequest(`/listings/${listingId}/status`, { config });
    return {
      status: data.status || 'unknown',
      views: data.views || 0,
      contacts: data.contacts || 0,
    };
  },
};
