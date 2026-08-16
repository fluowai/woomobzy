import { callApi } from '../src/lib/api';

export interface PortalInfo {
  name: string;
  label: string;
  enabled: boolean;
  configured: boolean;
}

export interface PortalPublishResult {
  portal: string;
  listingId: string;
  url: string | null;
  status: string;
}

export const portalService = {
  async list(): Promise<PortalInfo[]> {
    const data = await callApi('/api/portals');
    return data.portals || [];
  },

  async getConfig(portal: string) {
    const data = await callApi(`/api/portals/${portal}/config`);
    return data.config || null;
  },

  async saveConfig(portal: string, config: Record<string, any>) {
    return callApi(`/api/portals/${portal}/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  async publish(
    portal: string,
    propertyId: string
  ): Promise<PortalPublishResult> {
    return callApi(`/api/portals/${portal}/publish/${propertyId}`, {
      method: 'POST',
    });
  },

  async unpublish(portal: string, propertyId: string) {
    return callApi(`/api/portals/${portal}/unpublish/${propertyId}`, {
      method: 'POST',
    });
  },

  async status(portal: string, propertyId: string) {
    const data = await callApi(`/api/portals/${portal}/status/${propertyId}`);
    return data.status || null;
  },
};
