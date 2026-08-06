import fetch from 'node-fetch';
import { createHmac } from 'node:crypto';

export class AsaasService {
  static getBaseUrl() {
    return process.env.ASAAS_ENV === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';
  }

  static getHeaders() {
    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) throw new Error('ASAAS_API_KEY nao configurada');
    return {
      'Content-Type': 'application/json',
      access_token: apiKey,
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
    const res = await fetch(`${this.getBaseUrl()}${path}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
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

  static async paginate(path, params = {}) {
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

      const data = await this.request(`${path}?${query.toString()}`);
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
  static async getCustomer(customerId) {
    return this.request(`/customers/${encodeURIComponent(customerId)}`);
  }

  static async listCustomers(params = {}) {
    return this.paginate('/customers', params);
  }

  static async createCustomer(payload) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async updateCustomer(customerId, payload) {
    return this.request(`/customers/${encodeURIComponent(customerId)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async deleteCustomer(customerId) {
    return this.request(`/customers/${encodeURIComponent(customerId)}`, {
      method: 'DELETE',
    });
  }

  static async getOrCreateCustomer({
    name,
    cpfCnpj,
    email,
    mobilePhone,
    ...rest
  }) {
    if (cpfCnpj) {
      const list = await this.listCustomers({ cpfCnpj, limit: 1 });
      if (list.length > 0) return list[0];
    }

    const customer = await this.createCustomer({
      name,
      cpfCnpj: cpfCnpj || undefined,
      email: email || undefined,
      mobilePhone: mobilePhone || undefined,
      ...rest,
    });

    return customer;
  }

  /**
   * SUBSCRIPTIONS
   */
  static async getSubscription(subscriptionId) {
    return this.request(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
  }

  static async listSubscriptions(params = {}) {
    return this.paginate('/subscriptions', params);
  }

  static async createSubscription(payload) {
    return this.request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async updateSubscription(subscriptionId, payload) {
    return this.request(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  static async deleteSubscription(subscriptionId) {
    return this.request(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        method: 'DELETE',
      }
    );
  }

  static async getSubscriptionInvoice(subscriptionId) {
    return this.request(
      `/subscriptions/${encodeURIComponent(subscriptionId)}/invoice`
    );
  }

  /**
   * PAYMENTS
   */
  static async getPayment(paymentId) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}`);
  }

  static async listPayments(params = {}) {
    return this.paginate('/payments', params);
  }

  static async createPayment(payload) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async updatePayment(paymentId, payload) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async deletePayment(paymentId) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}`, {
      method: 'DELETE',
    });
  }

  static async refundPayment(paymentId, payload = {}) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: 'POST',
      body: JSON.stringify({
        value: payload.value || undefined,
        description: payload.description || undefined,
      }),
    });
  }

  static async confirmPayment(paymentId, payload = {}) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}/confirm`, {
      method: 'POST',
      body: JSON.stringify({
        sendSmsNotification: payload.sendSmsNotification || undefined,
        sendEmailNotification: payload.sendEmailNotification || undefined,
      }),
    });
  }

  static async restorePayment(paymentId) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}/restore`, {
      method: 'POST',
    });
  }

  static async receivePaymentInCash(paymentId, payload = {}) {
    return this.request(
      `/payments/${encodeURIComponent(paymentId)}/receiveInCash`,
      {
        method: 'POST',
        body: JSON.stringify({
          value: payload.value || undefined,
          paymentDate: payload.paymentDate || undefined,
        }),
      }
    );
  }

  static async undoPayment(paymentId) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}/undo`, {
      method: 'POST',
    });
  }

  /**
   * PAYMENT DUNNING
   */
  static async listPaymentDunnings(paymentId) {
    return this.request(`/payments/${encodeURIComponent(paymentId)}/dunnings`);
  }

  /**
   * PAYMENT NOTIFICATIONS
   */
  static async sendPaymentNotification(paymentId, payload = {}) {
    return this.request(
      `/payments/${encodeURIComponent(paymentId)}/sendNotification`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  /**
   * QRCODE
   */
  static async getPaymentQrcode(paymentId) {
    return this.request(
      `/payments/${encodeURIComponent(paymentId)}/identificationField`
    );
  }

  static async getQrcodeImage(encodedImage) {
    return this.request(`/qrCodeImage/${encodeURIComponent(encodedImage)}`);
  }

  /**
   * BILLING TYPES CONFIG
   */
  static async getBillingTypesConfiguration() {
    return this.request('/billingTypes/configuration');
  }

  static async updateBillingTypeConfiguration(payload) {
    return this.request('/billingTypes/configuration', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  /**
   * TRANSFERS / SPLIT
   */
  static async createTransfer(payload) {
    return this.request('/transfers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async getTransfer(transferId) {
    return this.request(`/transfers/${encodeURIComponent(transferId)}`);
  }

  static async listTransfers(params = {}) {
    return this.paginate('/transfers', params);
  }

  static async reverseTransfer(transferId, payload = {}) {
    return this.request(
      `/transfers/${encodeURIComponent(transferId)}/reverse`,
      {
        method: 'POST',
        body: JSON.stringify({
          value: payload.value || undefined,
          description: payload.description || undefined,
        }),
      }
    );
  }

  /**
   * WEBHOOK EVENTS
   */
  static async listWebhookEvents(params = {}) {
    return this.paginate('/webhookEvents', params);
  }

  static async getWebhookEvent(eventId) {
    return this.request(`/webhookEvents/${encodeURIComponent(eventId)}`);
  }

  /**
   * ACCOUNT BALANCE
   */
  static async getAccountBalance() {
    return this.request('/finance/balance');
  }

  /**
   * INVOICE (platform billing)
   */
  static async getInvoice(invoiceId) {
    return this.request(`/invoice/${encodeURIComponent(invoiceId)}`);
  }

  static async listInvoices(params = {}) {
    return this.paginate('/invoice', params);
  }

  /**
   * PAYMENT LINKS
   */
  static async createPaymentLink(payload) {
    return this.request('/paymentLinks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async getPaymentLink(linkId) {
    return this.request(`/paymentLinks/${encodeURIComponent(linkId)}`);
  }

  static async listPaymentLinks(params = {}) {
    return this.paginate('/paymentLinks', params);
  }

  static async deletePaymentLink(linkId) {
    return this.request(`/paymentLinks/${encodeURIComponent(linkId)}`, {
      method: 'DELETE',
    });
  }

  /**
   * DOCUMENTS
   */
  static async getDocument(documentId) {
    return this.request(`/documents/${encodeURIComponent(documentId)}`);
  }

  static async listDocuments(params = {}) {
    return this.paginate('/documents', params);
  }

  /**
   * NOTIFICATIONS
   */
  static async listNotifications(params = {}) {
    return this.paginate('/notifications', params);
  }

  /**
   * MACHINE ACCOUNT
   */
  static async getMachineAccount() {
    return this.request('/machineAccount');
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
