import { Lead } from '../types';
import { callApi } from '../src/lib/api';

export const leadService = {
  // Create a new lead (Now Backend-Driven)
  async create(lead: Partial<Lead>) {
    const data = await callApi('/api/crm/leads', {
      method: 'POST',
      body: JSON.stringify({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        property_id: lead.propertyId,
        source: lead.source
      })
    });

    return mapToModel(data.lead);
  },

  // List leads for Kanban (Implicitly Isolated by Backend)
  async list(page: number = 1, limit: number = 100) {
    const data = await callApi(`/api/crm/leads?page=${page}&limit=${limit}`);
    return data.leads.map(mapToModel);
  },

  // Update lead status (Now Backend-Driven)
  async updateStatus(id: string, status: string) {
    const data = await callApi(`/api/crm/leads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });

    return mapToModel(data.lead);
  },
};

const mapToModel = (dbItem: any): Lead => ({
  id: dbItem.id,
  organization_id: dbItem.organization_id,
  name: dbItem.name,
  email: dbItem.email,
  phone: dbItem.phone,
  source: dbItem.source,
  status: dbItem.status,
  budget: 0,
  preferences: {},
  createdAt: dbItem.created_at,
  propertyId: dbItem.property_id,
  property: dbItem.properties
    ? {
        title: dbItem.properties.title,
        price: dbItem.properties.price,
        image: dbItem.properties.images?.[0],
      }
    : undefined,
});
