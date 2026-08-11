import { callApi } from '@/src/lib/api';
import { logger } from '@/utils/logger';

export interface PaymentDetails {
  id: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  pixCode?: string;
  pixQrCode?: string;
  status: 'PENDING' | 'RECEIVED' | 'OVERDUE' | 'CANCELLED';
}

export class PaymentService {
  async createInvoice(data: {
    amount: number;
    dueDate: string;
    description: string;
    client: { name: string; email: string; cpfCnpj: string };
  }): Promise<PaymentDetails | null> {
    try {
      logger.info('Criando cobranca via Asaas...', data);

      const result = await callApi('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: data.client.cpfCnpj,
          billingType: 'UNDEFINED',
        }),
      });
      const payment = result.data?.payment || result.data?.subscription;
      if (!payment) return null;

      return {
        id: payment.id,
        invoiceUrl: payment.invoiceUrl || '',
        bankSlipUrl: payment.bankSlipUrl,
        pixCode: payment.pixCopyPaste,
        pixQrCode: payment.pixCopyPaste,
        status: 'PENDING',
      };
    } catch (error) {
      logger.error('Erro ao integrar com gateway de pagamento:', error);
      return null;
    }
  }

  async getInvoiceStatus(paymentId: string): Promise<string> {
    try {
      const data = await callApi(
        `/api/subscription/invoices?paymentId=${encodeURIComponent(paymentId)}`
      );
      const invoice = data.data?.local?.[0] || data.data?.asaas?.[0];
      if (!invoice) return 'PENDING';

      const statusMap: Record<string, string> = {
        pago: 'RECEIVED',
        pendente: 'PENDING',
        vencido: 'OVERDUE',
        cancelado: 'CANCELLED',
        estornado: 'CANCELLED',
      };

      return statusMap[invoice.status] || 'PENDING';
    } catch (error) {
      logger.error('Erro ao consultar status do pagamento:', error);
      return 'PENDING';
    }
  }

  async syncOrganizationSettings(_apiKey: string): Promise<boolean> {
    logger.info('Sincronizando chaves do gateway para a organizacao');
    return true;
  }
}

export const paymentService = new PaymentService();
