import {
  Property,
  PropertyType,
  PropertyStatus,
} from '../types';
import { callApi } from '../src/lib/api';

function mapToDatabase(model: Partial<Property> & { organization_id?: string; niche?: string }): any {
  const payload: any = {
    title: model.title,
    description: model.description,
    price: model.price,
    property_type: model.type || model.property_type,
    purpose: model.purpose,
    status: model.status,
    organization_id: model.organization_id,
    niche: model.niche || 'urbano',
    city: (model as any).city || (model as any).location?.city,
    neighborhood: (model as any).neighborhood || (model as any).location?.neighborhood,
    state: (model as any).state || (model as any).location?.state,
    address: (model as any).address || (model as any).location?.address,
    features: (model as any).features || {},
    images: (model as any).images || [],
    highlighted: (model as any).highlighted,
    owner_info: (model as any).ownerInfo || (model as any).owner_info,
    total_area_ha: (model as any).total_area_ha || (model as any).features?.areaHectares || null,
  };

  if (model.price && payload.total_area_ha > 0) {
    payload.price_per_ha = model.price / payload.total_area_ha;
  }

  return payload;
}

export const propertyService = {
  async list(page: number = 1, limit: number = 50, niche?: string) {
    let url = `/api/properties?page=${page}&limit=${limit}`;
    if (niche) url += `&niche=${niche}`;
    const data = await callApi(url);
    return (data.properties || []).map(mapToModel);
  },

  async getById(id: string) {
    const data = await callApi(`/api/properties/${id}`);
    return mapToModel(data.property);
  },

  async create(property: Partial<Property>) {
    const data = await callApi('/api/properties', {
      method: 'POST',
      body: JSON.stringify(mapToDatabase(property)),
    });
    return mapToModel(data.property);
  },

  async update(id: string, property: Partial<Property>) {
    const data = await callApi(`/api/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(mapToDatabase(property)),
    });
    return mapToModel(data.property);
  },

  async delete(id: string) {
    await callApi(`/api/properties/${id}`, {
      method: 'DELETE',
    });
  },

  async submit(property: Partial<Property>) {
    const data = await callApi('/api/properties', {
      method: 'POST',
      body: JSON.stringify(mapToDatabase(property)),
    });
    return mapToModel(data.property);
  },
};

const mapToModel = (dbItem: any): Property => ({
  id: dbItem.id,
  organization_id: dbItem.organization_id,
  title: dbItem.title || '',
  description: dbItem.description || '',
  price: dbItem.price || 0,
  type: (dbItem.property_type || dbItem.type) as PropertyType,
  purpose: dbItem.purpose || 'Venda',
  status: dbItem.status as PropertyStatus,
  city: dbItem.city || '',
  state: dbItem.state || '',
  address: dbItem.address || '',
  neighborhood: dbItem.neighborhood || '',
  features: dbItem.features || {},
  images: dbItem.images || [],
  broker_id: dbItem.broker_id || '',
  niche: dbItem.niche || 'urbano',
  total_area_ha: dbItem.total_area_ha || 0,
  created_at: dbItem.created_at,
  updated_at: dbItem.updated_at,
});
