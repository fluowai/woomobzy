import { callApi } from '../src/lib/api';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  document_number: string;
  document_type: string;
  roles: string[];
  city: string;
  state: string;
  address: string;
  neighborhood: string;
  zip_code: string;
  notes: string;
  created_at: string;
}

export const clientService = {
  async list(search?: string, roles?: string[]) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roles?.length) params.set('roles', roles.join(','));
    const data = await callApi(`/api/crm/clients?${params}`);
    return data.clients as Client[];
  },

  async create(client: Partial<Client>) {
    const data = await callApi('/api/crm/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    });
    return data.client as Client;
  },

  async update(id: string, client: Partial<Client>) {
    const data = await callApi(`/api/crm/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(client),
    });
    return data.client as Client;
  },

  async delete(id: string) {
    return callApi(`/api/crm/clients/${id}`, { method: 'DELETE' });
  },
};
