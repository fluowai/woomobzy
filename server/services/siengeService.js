function required(value, message) {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function buildBasicAuth(user, secret) {
  return Buffer.from(`${user}:${secret}`).toString('base64');
}

/**
 * Cliente real da integração Sienge.
 *
 * A URL base varia por conta/ambiente do Sienge e deve ser informada por tenant
 * ou por variável de ambiente. Sem URL e credenciais, a integração falha de forma
 * explícita para evitar retorno demonstrativo no produto.
 */
export class SiengeService {
  constructor(organizationId, apiKey, apiSecret, options = {}) {
    this.organizationId = organizationId;
    this.apiKey = apiKey || process.env.SIENGE_API_USER;
    this.apiSecret = apiSecret || process.env.SIENGE_API_SECRET;
    this.baseUrl = (options.baseUrl || process.env.SIENGE_API_URL || '').replace(/\/$/, '');
    this.customerEndpoint = options.customerEndpoint || process.env.SIENGE_CUSTOMER_ENDPOINT || '/customers';
    this.financialTransfersEndpoint =
      options.financialTransfersEndpoint ||
      process.env.SIENGE_FINANCIAL_TRANSFERS_ENDPOINT ||
      '/accounts-receivable/receivable-bills';
  }

  getHeaders() {
    required(this.baseUrl, 'SIENGE_API_URL não configurada para esta organização.');
    required(this.apiKey, 'Usuário/chave de API Sienge não configurado.');
    required(this.apiSecret, 'Segredo/senha de API Sienge não configurado.');

    return {
      Authorization: `Basic ${buildBasicAuth(this.apiKey, this.apiSecret)}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
  }

  async request(path, options = {}) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const response = await fetch(`${this.baseUrl}${normalizedPath}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      }
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(
        `Sienge API ${response.status}: ${body?.message || body?.error || text || response.statusText}`
      );
    }

    return body;
  }

  async testConnection() {
    await this.request(process.env.SIENGE_HEALTH_ENDPOINT || '/companies', { method: 'GET' });
    return { success: true, message: 'Conexão real com Sienge validada.' };
  }

  async syncCustomers(customers) {
    if (!Array.isArray(customers) || customers.length === 0) {
      return [];
    }

    const synced = [];
    for (const customer of customers) {
      const result = await this.request(this.customerEndpoint, {
        method: 'POST',
        body: JSON.stringify(customer)
      });

      synced.push({
        ...customer,
        sienge_id: result?.id || result?.customerId || result?.data?.id || null,
        sienge_response: result
      });
    }

    return synced;
  }

  async getFinancialTransfers(projectId) {
    required(projectId, 'projectId é obrigatório para consultar repasses financeiros Sienge.');

    const params = new URLSearchParams({
      projectId: String(projectId)
    });

    return this.request(`${this.financialTransfersEndpoint}?${params.toString()}`, { method: 'GET' });
  }
}

export const createSiengeService = (organizationId, apiKey, apiSecret, options) => {
  return new SiengeService(organizationId, apiKey, apiSecret, options);
};
