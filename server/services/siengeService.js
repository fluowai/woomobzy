/**
 * Mock Service for Sienge ERP integration
 */
export class SiengeService {
  constructor(organizationId, apiKey, apiSecret) {
    this.organizationId = organizationId;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = 'https://api.sienge.com.br/v1';
  }

  async testConnection() {
    console.log(
      `[Sienge] Testing connection for organization ${this.organizationId}...`
    );
    return { success: true, message: 'Connected to Sienge ERP successfully.' };
  }

  async syncCustomers(customers) {
    console.log(`[Sienge] Syncing ${customers.length} customers to Sienge...`);
    // Mock API call
    return customers.map((c) => ({
      ...c,
      sienge_id: `SIENGE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    }));
  }

  async getFinancialTransfers(projectId) {
    console.log(
      `[Sienge] Fetching financial transfers for project ${projectId}...`
    );
    // Mock API call
    return [
      {
        clientName: 'John Doe',
        amount: 250000.0,
        status: 'analysis',
        expected_date: '2026-08-15',
      },
    ];
  }
}

export const createSiengeService = (organizationId, apiKey, apiSecret) => {
  return new SiengeService(organizationId, apiKey, apiSecret);
};
