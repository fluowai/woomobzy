export interface AsgardPayPayment {
  id: string;
  invoiceUrl: string;
  pixCode?: string;
  qrCode?: string;
  status: 'pending' | 'paid' | 'failed' | 'overdue' | 'cancelled';
  amount: number;
  dueDate: string;
  description: string;
  clientEmail: string;
  clientName: string;
}

export interface CreatePaymentData {
  clientId: string;
  clientEmail: string;
  clientName: string;
  amount: number;
  description: string;
  dueDate: string;
  type?: 'pix' | 'boleto' | 'card';
}

export interface PaymentResponse {
  success: boolean;
  data?: AsgardPayPayment;
  error?: string;
}

export class AsgardPayService {
  private publicKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor(options?: { publicKey?: string; secretKey?: string }) {
    const publicKey = options?.publicKey || process.env.ASGARDPAY_PUBLIC_KEY;
    const secretKey = options?.secretKey || process.env.ASGARDPAY_SECRET_KEY;

    if (!publicKey || !secretKey) {
      throw new Error(
        'Chaves AsgardPay não configuradas. Defina ASGARDPAY_PUBLIC_KEY e ASGARDPAY_SECRET_KEY ou passe chaves no options.'
      );
    }

    this.publicKey = publicKey;
    this.secretKey = secretKey;
    this.baseUrl = 'https://api.asgardpay.com.br/v1';
  }

  private async apiRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'AsgardPay-Public-Key': this.publicKey,
        'AsgardPay-Secret-Key': this.secretKey,
      },
      ...options,
    };

    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `AsgardPay API error: ${response.status} - ${errorBody}`
      );
    }

    return response.json();
  }

  async createPayment(data: CreatePaymentData): Promise<AsgardPayPayment> {
    const result = await this.apiRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return {
      id: result.id || result.invoice_id || '',
      invoiceUrl: result.invoice_url || result.payment_url || '',
      pixCode: result.pix_code || result.qr_code || '',
      status: result.status || 'pending',
      amount: result.amount || data.amount,
      dueDate: result.due_date || data.dueDate,
      description: result.description || data.description,
      clientEmail: result.client_email || data.clientEmail,
      clientName: result.client_name || data.clientName,
    };
  }

  async getPaymentStatus(paymentId: string): Promise<AsgardPayPayment> {
    const result = await this.apiRequest(`/payments/${paymentId}`, {
      method: 'GET',
    });

    return {
      id: result.id || paymentId,
      invoiceUrl: result.invoice_url || '',
      pixCode: result.pix_code || result.qr_code || '',
      status: result.status || 'pending',
      amount: result.amount || 0,
      dueDate: result.due_date || '',
      description: result.description || '',
      clientEmail: result.client_email || '',
      clientName: result.client_name || '',
    };
  }

  async verifyWebhookSignature(
    rawBody: string,
    signature: string | undefined
  ): Promise<boolean> {
    if (!signature) return false;

    // Implementar verificação de HMAC-SHA256 da AsgardPay
    // A AsgardPay envia uma assinatura HMAC-SHA256 no header X-AsgardPay-Signature
    // que contém o corpo da requisição assinado com a secret key
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(rawBody);
    const digest = hmac.digest('hex');

    return digest === signature;
  }
}

export const asgardpay = new AsgardPayService();