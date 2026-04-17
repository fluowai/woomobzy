import axios from 'axios';

const DA_URL = process.env.DIRECT_ADMIN_URL;
const DA_USER = process.env.DIRECT_ADMIN_USER;
const DA_KEY = process.env.DIRECT_ADMIN_API_KEY;
const MAIN_DOMAIN = process.env.WHM_MAIN_DOMAIN || 'consultio.com.br';

/**
 * DirectAdmin API Service
 * Handles DNS record creation via CMD_API_DNS_CONTROL
 */
export const directAdminService = {
  /**
   * Adds a CNAME record for a new tenant
   * @param {string} subdomain - The subdomain to create (e.g. 'pagaio')
   * @returns {Promise<Object>} Result of the operation
   */
  async addTenantDNS(subdomain) {
    if (!DA_URL || !DA_USER || !DA_KEY) {
      console.warn('⚠️ DirectAdmin não configurado no .env. Pulando criação de DNS.');
      return { success: false, reason: 'DA_NOT_CONFIGURED' };
    }

    try {
      console.log(`📡 DirectAdmin: Criando CNAME para ${subdomain}.${MAIN_DOMAIN}`);

      // Basic Auth formatting (user:password or user|keyname:key)
      const authHeader = Buffer.from(`${DA_USER}:${DA_KEY}`).toString('base64');

      const params = new URLSearchParams({
        domain: MAIN_DOMAIN,
        action: 'add',
        type: 'CNAME',
        name: subdomain,
        value: 'cname.vercel-dns.com.', // Deve terminar com ponto
      });

      const response = await axios.post(`${DA_URL}/CMD_API_DNS_CONTROL`, params.toString(), {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      });

      // DirectAdmin returns URL encoded results in body
      if (response.data.includes('error=0')) {
        console.log(`✅ DirectAdmin: Registro DNS criado com sucesso para ${subdomain}`);
        return { success: true, data: response.data };
      } else {
        console.error('❌ DirectAdmin Error Response:', response.data);
        return { success: false, reason: 'API_ERROR_MESSAGE', data: response.data };
      }
    } catch (error) {
      console.error('❌ DirectAdmin Exception:', error.response?.data || error.message);
      return { success: false, reason: 'EXCEPTIONS', error: error.message };
    }
  }
};
