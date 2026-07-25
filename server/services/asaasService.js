import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

/**
 * Serviço de Integração com ASAAS
 * Focado em Gestão de Aluguéis e Split de Pagamento
 */
export class AsaasService {
  static getBaseUrl() {
    return process.env.ASAAS_ENV === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';
  }

  static getHeaders() {
    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) throw new Error('ASAAS_API_KEY não configurada');
    return {
      'Content-Type': 'application/json',
      access_token: apiKey,
    };
  }

  /**
   * Cria ou busca um cliente no Asaas pelo CPF/CNPJ
   */
  static async getOrCreateCustomer(tenantData) {
    const { tenant_name, tenant_cpf, tenant_email, tenant_phone } = tenantData;

    try {
      if (tenant_cpf) {
        // Busca se já existe
        const searchUrl = `${this.getBaseUrl()}/customers?cpfCnpj=${tenant_cpf}`;
        const searchRes = await fetch(searchUrl, { headers: this.getHeaders() });
        const searchData = await searchRes.json();

        if (searchData.data && searchData.data.length > 0) {
          return searchData.data[0].id; // Retorna o ID existente
        }
      }

      // Cria novo cliente
      const createRes = await fetch(`${this.getBaseUrl()}/customers`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: tenant_name,
          cpfCnpj: tenant_cpf || '',
          email: tenant_email || '',
          mobilePhone: tenant_phone || '',
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(`Erro ao criar cliente no Asaas: ${JSON.stringify(createData)}`);
      }

      return createData.id;
    } catch (error) {
      logger.error('[AsaasService] getOrCreateCustomer error:', error);
      throw error;
    }
  }

  /**
   * Cria uma cobrança (Boleto/Pix) com Split de Pagamento
   * @param {Object} chargeData - Dados da fatura
   * @param {string} chargeData.customer - Asaas Customer ID
   * @param {number} chargeData.value - Valor total
   * @param {string} chargeData.dueDate - YYYY-MM-DD
   * @param {string} chargeData.description - Descrição do boleto
   * @param {string} chargeData.ownerWalletId - Wallet ID do proprietário no Asaas (Para o Split)
   * @param {number} chargeData.imobzyFeePercentage - Porcentagem de comissão da imobiliária (ex: 10)
   */
  static async createChargeWithSplit(chargeData) {
    const {
      customer,
      value,
      dueDate,
      description,
      ownerWalletId,
      imobzyFeePercentage = 10,
    } = chargeData;

    const payload = {
      customer,
      billingType: 'UNDEFINED', // Permite Boleto, Pix e Cartão
      value,
      dueDate,
      description,
    };

    // Aplica o Split se houver carteira do proprietário configurada
    if (ownerWalletId) {
      const ownerAmount = value - (value * (imobzyFeePercentage / 100));
      
      payload.split = [
        {
          walletId: ownerWalletId,
          fixedValue: ownerAmount,
          status: 'PENDING', // Repassa quando pago
          refusalReason: null
        }
        // O valor residual (comissão) fica na carteira principal (da imobiliária)
      ];
    }

    try {
      const res = await fetch(`${this.getBaseUrl()}/payments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(`Erro ao criar cobrança no Asaas: ${JSON.stringify(data)}`);
      }

      return {
        id: data.id,
        invoiceUrl: data.invoiceUrl,
        bankSlipUrl: data.bankSlipUrl,
        pixCopyPaste: data.pixCopyPaste || '', // Caso a integração retorne o payload do pix direto
      };
    } catch (error) {
      logger.error('[AsaasService] createChargeWithSplit error:', error);
      throw error;
    }
  }

  /**
   * Processa o Webhook do Asaas
   */
  static async handleWebhook(payload) {
    const { event, payment } = payload;
    
    // Status que nos importam: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE, PAYMENT_DELETED
    if (!payment || !payment.id) return null;

    let newStatus = null;
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      newStatus = 'pago';
    } else if (event === 'PAYMENT_OVERDUE') {
      newStatus = 'vencido';
    } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
      newStatus = 'cancelado';
    }

    return {
      asaasChargeId: payment.id,
      status: newStatus,
      paymentDate: payment.clientPaymentDate || payment.paymentDate,
      paidAmount: payment.netValue || payment.value,
    };
  }
}
