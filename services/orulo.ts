import { callApi } from '../src/lib/api';

export const oruloService = {
  async status() {
    return callApi('/api/orulo/status');
  },

  async sync(
    options: {
      updated_after?: string;
      max_buildings?: number;
      sync_removed?: boolean;
      filters?: Record<string, any>;
    } = {}
  ) {
    return callApi('/api/orulo/sync', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  async metadata(type: string, query: Record<string, any> = {}) {
    const search = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => search.append(key, String(item)));
      } else if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });

    return callApi(
      `/api/orulo/metadata/${type}${search.toString() ? `?${search.toString()}` : ''}`
    );
  },

  async endUserStatus() {
    return callApi('/api/orulo/end-user/status');
  },

  async getEndUserAuthorizeUrl(redirectUri: string) {
    return callApi('/api/orulo/end-user/authorize-url', {
      method: 'POST',
      body: JSON.stringify({ redirect_uri: redirectUri }),
    });
  },

  async connectEndUser(code: string, redirectUri: string) {
    return callApi('/api/orulo/end-user/callback', {
      method: 'POST',
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    });
  },

  async fetchProtected(resource: string) {
    return callApi('/api/orulo/end-user/proxy', {
      method: 'POST',
      body: JSON.stringify({ resource }),
    });
  },

  async disconnectEndUser() {
    return callApi('/api/orulo/end-user/connection', {
      method: 'DELETE',
    });
  },

  async getMasterCredentials() {
    return callApi('/api/orulo/master-credentials');
  },

  async saveMasterCredentials(clientId: string, clientSecret: string) {
    return callApi('/api/orulo/master-credentials', {
      method: 'PUT',
      body: JSON.stringify({ clientId, clientSecret }),
    });
  },

  async updatePublicationLinks(
    buildingId: string,
    publicationLinks: Array<{ url?: string; active: boolean }>
  ) {
    return callApi(`/api/orulo/publication-links/${buildingId}`, {
      method: 'POST',
      body: JSON.stringify({ publication_links: publicationLinks }),
    });
  },
};
