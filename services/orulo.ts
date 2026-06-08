import { callApi } from '../src/lib/api';

export const oruloService = {
  async status() {
    return callApi('/api/orulo/status');
  },

  async sync(options: { updated_after?: string; max_buildings?: number; sync_removed?: boolean } = {}) {
    return callApi('/api/orulo/sync', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },
};
