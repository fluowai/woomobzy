import axios from 'axios';

const DA_URL = process.env.DIRECT_ADMIN_URL;
const DA_USER = process.env.DIRECT_ADMIN_USER;
const DA_KEY = process.env.DIRECT_ADMIN_API_KEY;
const MAIN_DOMAIN = process.env.WHM_MAIN_DOMAIN || 'imobfluow.com.br';
const PLATFORM_PUBLIC_IP =
  process.env.PLATFORM_PUBLIC_IP ||
  process.env.SERVER_PUBLIC_IP ||
  process.env.APP_PUBLIC_IP ||
  process.env.VITE_PLATFORM_IP ||
  '';

export const directAdminService = {
  async addTenantDNS(subdomain) {
    if (!DA_URL || !DA_USER || !DA_KEY) {
      console.warn('DirectAdmin nao configurado no .env. Pulando criacao de DNS.');
      return { success: false, reason: 'DA_NOT_CONFIGURED' };
    }

    try {
      const authHeader = Buffer.from(`${DA_USER}:${DA_KEY}`).toString('base64');
      const params = new URLSearchParams({
        domain: MAIN_DOMAIN,
        action: 'add',
        type: 'A',
        name: subdomain,
        value: PLATFORM_PUBLIC_IP || '207.58.153.219',
      });

      const response = await axios.post(`${DA_URL}/CMD_API_DNS_CONTROL`, params.toString(), {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      });

      if (String(response.data).includes('error=0')) {
        return { success: true, data: response.data };
      }

      return { success: false, reason: 'API_ERROR_MESSAGE', data: response.data };
    } catch (error) {
      return { success: false, reason: 'EXCEPTION', error: error.message };
    }
  },
};
