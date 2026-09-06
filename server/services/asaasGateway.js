import { getSupabaseServer } from '../lib/supabase-server.js';
import { logger } from '../utils/logger.js';

const STATUS_BY_EVENT = {
  PAYMENT_RECEIVED: 'pago',
  PAYMENT_CONFIRMED: 'pago',
  PAYMENT_OVERDUE: 'vencido',
  PAYMENT_DELETED: 'cancelado',
  PAYMENT_REFUNDED: 'cancelado'
};

class AsaasGateway {
  constructor() {
    this.apiUrl = process.env.ASAAS_API_URL || (
      process.env.ASAAS_ENV === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://sandbox.asaas.com/api/v3'
    );
  }

  getHeaders() {
    const apiKey = process.env.ASAAS_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('ASAAS_API_KEY nao configurada');
    }

    return {
      'Content-Type': 'application/json',
      access_token: apiKey
    };
  }

  async createCharge(customerInfo, billingInfo) {
    const customerId = customerInfo?.id || await this.getOrCreateCustomer(customerInfo);
    const payload = {
      customer: customerId,
      billingType: billingInfo?.billingType || 'UNDEFINED',
      value: Number(billingInfo?.value ?? billingInfo?.amount),
      dueDate: billingInfo?.dueDate,
      description: billingInfo?.description,
      externalReference: billingInfo?.externalReference
    };

    if (!payload.value || !payload.dueDate || !payload.description) {
      throw new Error('value, dueDate e description sao obrigatorios para criar cobranca Asaas');
    }

    if (billingInfo?.split) {
      payload.split = billingInfo.split;
    }

    const data = await this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return {
      id: data.id,
      status: data.status,
      invoiceUrl: data.invoiceUrl,
      bankSlipUrl: data.bankSlipUrl,
      pixCopyPaste: data.pixCopyPaste || null,
      raw: data
    };
  }

  async getOrCreateCustomer(customerInfo = {}) {
    if (customerInfo.id) return customerInfo.id;

    const cpfCnpj = customerInfo.cpfCnpj || customerInfo.cpf || customerInfo.cnpj;
    if (cpfCnpj) {
      const search = await this.request(`/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`);
      const existing = search?.data?.[0];
      if (existing?.id) return existing.id;
    }

    const data = await this.request('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: customerInfo.name,
        cpfCnpj: cpfCnpj || undefined,
        email: customerInfo.email || undefined,
        mobilePhone: customerInfo.phone || customerInfo.mobilePhone || undefined
      })
    });

    return data.id;
  }

  async handleWebhook(payload) {
    const event = payload?.event;
    const payment = payload?.payment;
    if (!event || !payment?.id) {
      return { success: true, action: 'IGNORED', reason: 'UNSUPPORTED_PAYLOAD' };
    }

    const status = STATUS_BY_EVENT[event];
    if (!status) {
      return { success: true, action: 'IGNORED', event };
    }

    const supabase = getSupabaseServer();
    const updates = {
      status
    };

    if (status === 'pago') {
      updates.payment_date = payment.clientPaymentDate || payment.paymentDate || new Date().toISOString().slice(0, 10);
      updates.paid_amount = payment.netValue ?? payment.value ?? null;
      updates.payment_method = 'asaas';
    }

    const invoiceUpdate = await supabase
      .from('invoices')
      .update(updates)
      .eq('gateway_id', payment.id)
      .select('id');

    if (invoiceUpdate.error) throw invoiceUpdate.error;

    const billingUpdates = {
      status,
      observation: `Asaas ${event}: ${payment.id}`
    };

    if (status === 'pago') {
      billingUpdates.payment_date = updates.payment_date;
    }

    const billingUpdate = await supabase
      .from('billing')
      .update(billingUpdates)
      .or(`nossonumero.eq.${payment.id},barcode.eq.${payment.id}`)
      .select('id');

    if (billingUpdate.error) {
      logger.warn('[AsaasGateway] Could not update legacy billing table', { error: billingUpdate.error.message });
    }

    return {
      success: true,
      action: 'PAYMENT_STATUS_SYNCED',
      event,
      paymentId: payment.id,
      status,
      invoicesUpdated: invoiceUpdate.data?.length || 0,
      billingsUpdated: billingUpdate.data?.length || 0
    };
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.apiUrl}${path}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Erro Asaas ${response.status}: ${JSON.stringify(data)}`);
    }

    return data;
  }
}

export { AsaasGateway, STATUS_BY_EVENT };
export default new AsaasGateway();
