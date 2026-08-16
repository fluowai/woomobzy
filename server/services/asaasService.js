import fetch from 'node-fetch';
import { createHmac } from 'node:crypto';

export class AsaasService {
  static getBaseUrl() {
    return process.env.ASAAS_ENV === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';
  }

  static getHeaders(apiKey) {
    const key = apiKey || process.env.ASAAS_API_KEY;
    if (!key) throw new Error('ASAAS_API_KEY nao configurada');
    return {
      'Content-Type': 'application/json',
      access_token: key,
    };
  }

  static verifyWebhookSignature(rawBody, signatureHeader) {
    const secret = process.env.ASAAS_WEBHOOK_SECRET;
    if (!secret) return true;
    if (!signatureHeader) return false;

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    return signatureHeader === expected;
  }

  static async request(path, options = {}) {
    const apiKey = options.apiKey;
    const res = await fetch(`${this.getBaseUrl()}${path}`, {
      ...options,
      headers: {
        ...this.getHeaders(apiKey),
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        data.errors?.map((e) => e.description).join(', ') ||
        data.message ||
        JSON.stringify(data);
      throw new Error(`Asaas [${res.status}] ${path}: ${message}`);
    }

    return data;
  }

  static async paginate(path, params = {}, apiKey) {
    const results = [];
    let offset = 0;
    const limit = params.limit || 100;

    while (true) {
      const query = new URLSearchParams();
      if (params.offset === undefined) query.set('offset', String(offset));
      if (params.limit) query.set('limit', String(limit));
      Object.entries(params).forEach(([key, value]) => {
        if (
          key !== 'offset' &&
          key !== 'limit' &&
          value !== undefined &&
          value !== null &&
          value !== ''
        ) {
          query.set(key, String(value));
        }
      });

      const data = await this.request(`${path}?${query.toString()}`, {
        apiKey,
      });
      const items = data.data || [];
      results.push(...items);

      if (items.length < limit) break;
      offset += limit;
    }

    return results;
  }

  /**
   * CUSTOMERS
   */
  static async getCustomer(customerId, apiKey) {
    return this.request(`/customers/${encodeURIComponent(customerId)}`, {
      apiKey,
    });
  }

  static async listCustomers(params = {}, apiKey) {
    return this.paginate('/customers', params, apiKey);
  }

  static async createCustomer(payload, apiKey) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
      apiKey,
    });
  }

  static async updateCustomer(customerId, payload, apiKey) {
    return this.request(`/customers/${encodeURIComponent(customerId)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
      apiKey,
    });
  }

  static async deleteCustomer(customerId, apiKey) {
    return this.request(`/customers/${encodeURIComponent(customerId)}`, {
      method: 'DELETE',
      apiKey,
    });
  }

  static async getOrCreateCustomer(
    { name, cpfCnpj, email, mobilePhone, ...rest },
    apiKey
  ) {
    if (cpfCnpj) {
      const list = await this.listCustomers({ cpfCnpj, limit: 1 }, apiKey);
      if (list.length > 0) return list[0];
    }

    const customer = await this.createCustomer(
      {
        name,
        cpfCnpj: cpfCnpj || undefined,
        email: email || undefined,
        mobilePhone: mobilePhone || undefined,
        ...rest,
      },
      apiKey
    );

    return customer;
  }

  /**
   * SUBSCRIPTIONS
   */
  static async getSubscription(subscriptionId, apiKey) {
    return this.request(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      { apiKey }
    );
  }

  static async listSubscriptions(params = {}, apiKey) {
    return this.paginate('/subscriptions', params, apiKey);
  }

  static async createSubscription(payload, apiKey) {
    return this.request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(payload),
      apiKey,
    });
  }

  static async updateSubscription(subscriptionId, payload, apiKey) {
    return this.request(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
        apiKey,
      }
    );
  }

  static async deleteSubscription(subscriptionId, apiKey) {
    return this.request(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        method: 'DELETE',
        apiKey,
      }
    );
  }

  static async getSubscriptionInvoice(subscriptionId, apiKey) {
    return this.request(
      `/subscriptions/${encodeURIComponent(subscriptionId)}/invoice`,
      { apiKey }
    );
  }

  /**
   * PAYMENTS
   */
  static async getPayment(paymentId, apiKey) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}`, {
      apiKey,
    });
  }

  static async listPayments(params = {}, apiKey) {
    return this.paginate('/payments', params, apiKey);
  }

  static async createPayment(payload, apiKey) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
      apiKey,
    });
  }

  static async updatePayment(paymentId, payload, apiKey) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
      apiKey,
    });
  }

  static async deletePayment(paymentId, apiKey) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}`, {
      method: 'DELETE',
      apiKey,
    });
  }

  static async refundPayment(paymentId, payload = {}, apiKey) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: 'POST',
      body: JSON.stringify({
        value: payload.value || undefined,
        description: payload.description || undefined,
      }),
      apiKey,
    });
  }

  static async confirmPayment(paymentId, payload = {}, apiKey) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}/confirm`, {
      method: 'POST',
      body: JSON.stringify({
        sendSmsNotification: payload.sendSmsNotification || undefined,
        sendEmailNotification: payload.sendEmailNotification || undefined,
      }),
      apiKey,
    });
  }

  static async restorePayment(paymentId, apiKey) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}/restore`, {
      method: 'POST',
      apiKey,
    });
  }

  static async receivePaymentInCash(paymentId, payload = {}, apiKey) {
    return this.request(
      `/payments/${encodeURIComponent(paymentId)}/receiveInCash`,
      {
        method: 'POST',
        body: JSON.stringify({
          value: payload.value || undefined,
          paymentDate: payload.paymentDate || undefined,
        }),
        apiKey,
      }
    );
  }

  static async undoPayment(paymentId, apiKey) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}/undo`, {
      method: 'POST',
      apiKey,
    });
  }

  /**
   * PAYMENT DUNNING
   */
  static async listPaymentDunnings(paymentId, apiKey) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}/dunnings`, {
      apiKey,
    });
  }

  static async sendPaymentNotification(paymentId, payload = {}, apiKey) {
    return this.request(
      `/payments/${encodeURIComponent(paymentId)}/sendNotification`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
        apiKey,
      }
    );
  }

  static async getPaymentQrcode(paymentId, apiKey) {
    return this.request(
      `/payments/${encodeURIComponent(paymentId)}/identificationField`,
      { apiKey }
    );
  }

  static async getQrcodeImage(encodedImage, apiKey) {
    return this.request(`/qrCodeImage/${encodeURIComponent(encodedImage)}`, {
      apiKey,
    });
  }

  static async getBillingTypesConfiguration(apiKey) {
    return this.request('/billingTypes/configuration', { apiKey });
  }

  static async updateBillingTypeConfiguration(payload, apiKey) {
    return this.request('/billingTypes/configuration', {
      method: 'PUT',
      body: JSON.stringify(payload),
      apiKey,
    });
  }

  static async createTransfer(payload, apiKey) {
    return this.request('/transfers', {
      method: 'POST',
      body: JSON.stringify(payload),
      apiKey,
    });
  }

  static async getTransfer(transferId, apiKey) {
    return this.request(`/transfers/${encodeURIComponent(transferId)}`, {
      apiKey,
    });
  }

  static async listTransfers(params = {}, apiKey) {
    return this.paginate('/transfers', params, apiKey);
  }

  static async reverseTransfer(transferId, payload = {}, apiKey) {
    return this.request(
      `/transfers/${encodeURIComponent(transferId)}/reverse`,
      {
        method: 'POST',
        body: JSON.stringify({
          value: payload.value || undefined,
          description: payload.description || undefined,
        }),
        apiKey,
      }
    );
  }

  static async listWebhookEvents(params = {}, apiKey) {
    return this.paginate('/webhookEvents', params, apiKey);
  }

  static async getWebhookEvent(eventId, apiKey) {
    return this.request(`/webhookEvents/${encodeURIComponent(eventId)}`, {
      apiKey,
    });
  }

  static async getAccountBalance(apiKey) {
    return this.request('/finance/balance', { apiKey });
  }

  static async getInvoice(invoiceId, apiKey) {
    return this.request(`/invoice/${encodeURIComponent(invoiceId)}`, {
      apiKey,
    });
  }

  static async listInvoices(params = {}, apiKey) {
    return this.paginate('/invoice', params, apiKey);
  }

  static async createPaymentLink(payload, apiKey) {
    return this.request('/paymentLinks', {
      method: 'POST',
      body: JSON.stringify(payload),
      apiKey,
    });
  }

  static async getPaymentLink(linkId, apiKey) {
    return this.request(`/paymentLinks/${encodeURIComponent(linkId)}`, {
      apiKey,
    });
  }

  static async listPaymentLinks(params = {}, apiKey) {
    return this.paginate('/paymentLinks', params, apiKey);
  }

  static async deletePaymentLink(linkId, apiKey) {
    return this.request(`/paymentLinks/${encodeURIComponent(linkId)}`, {
      method: 'DELETE',
      apiKey,
    });
  }

  static async getDocument(documentId, apiKey) {
    return this.request(`/documents/${encodeURIComponent(documentId)}`, {
      apiKey,
    });
  }

  static async listDocuments(params = {}, apiKey) {
    return this.paginate('/documents', params, apiKey);
  }

  static async listNotifications(params = {}, apiKey) {
    return this.paginate('/notifications', params, apiKey);
  }

  static async getMachineAccount(apiKey) {
    return this.request('/machineAccount', { apiKey });
  }

  static async createChargeWithSplit({
    customer,
    value,
    dueDate,
    description,
    ownerWalletId,
    imobzyFeePercentage,
    apiKey,
  }) {
    const charge = await this.createPayment(
      {
        customer,
        billingType: 'PIX',
        value,
        dueDate,
        description,
        externalReference: `LEASE_SPLIT_${customer}_${Date.now()}`,
        split: ownerWalletId
          ? [
              {
                walletId: ownerWalletId,
                fixedValue: null,
                percentage: 100 - (imobzyFeePercentage || 10),
              },
            ]
          : undefined,
      },
      apiKey
    );

    return charge;
  }

  /**
   * UTIL: Normalize payment event
   */
  static handleWebhook(payload) {
    const { event, payment } = payload;

    if (!payment || !payment.id) return null;

    let newStatus = null;
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      newStatus = 'pago';
    } else if (event === 'PAYMENT_OVERDUE') {
      newStatus = 'vencido';
    } else if (
      event === 'PAYMENT_DELETED' ||
      event === 'PAYMENT_REFUNDED' ||
      event === 'PAYMENT_DUNNING_RECEIVED'
    ) {
      newStatus = 'cancelado';
    }

    return {
      asaasChargeId: payment.id,
      status: newStatus,
      paymentDate: payment.clientPaymentDate || payment.paymentDate,
      paidAmount: payment.netValue || payment.value,
      event,
      payload,
    };
  }
}
