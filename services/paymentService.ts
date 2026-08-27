import { logger } from '@/utils/logger';
import { AsgardPayService } from './asgardpayService';

const asgardpay = new AsgardPayService();

export interface PaymentDetails {
  id: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  pixCode?: string;
  pixQrCode?: string;
  status: 'PENDING' | 'RECEIVED' | 'OVERDUE' | 'CANCELLED';
  amount: number;
  dueDate: string;
  description: string;
}

export interface CreateInvoiceData {
  amount: number;
  dueDate: string;
  description: string;
  client: { name: string; email: string; cpfCnpj: string };
}

export class PaymentService {
  async createInvoice(data: CreateInvoiceData): Promise<PaymentDetails | null> {
    try {
      logger.info('Iniciando criação de cobrança no AsgardPay...', data);

      const result = await asgardpay.createPayment({
        clientId: data.client.cpfCnpj,
        clientEmail: data.client.email,
        clientName: data.client.name,
        amount: data.amount,
        description: data.description,
        dueDate: data.dueDate,
        type: 'pix',
      });

      logger.info('Cobrança AsgardPay criada com sucesso:', result.id);

      let mappedStatus: 'PENDING' | 'RECEIVED' | 'OVERDUE' | 'CANCELLED' = 'PENDING';
      const rStatus = result.status.toLowerCase();
      if (rStatus === 'paid' || rStatus === 'received') mappedStatus = 'RECEIVED';
      else if (rStatus === 'overdue') mappedStatus = 'OVERDUE';
      else if (rStatus === 'cancelled') mappedStatus = 'CANCELLED';

      return {
        id: result.id,
        invoiceUrl: result.invoiceUrl,
        pixCode: result.pixCode,
        status: mappedStatus,
        amount: result.amount,
        dueDate: result.dueDate,
        description: result.description,
      };
    } catch (error) {
      logger.error('Erro ao integrar com AsgardPay:', error);
      return null;
    }
  }

  async getInvoiceStatus(paymentId: string): Promise<string> {
    try {
      const status = await asgardpay.getPaymentStatus(paymentId);
      return status.status;
    } catch (error) {
      logger.error('Erro ao consultar status do pagamento:', error);
      return 'PENDING';
    }
  }

  async syncOrganizationSettings(apiKey: string): Promise<boolean> {
    logger.info('Sincronizando chaves do AsgardPay para a organização');
    try {
      // Validar a chave pública
      if (apiKey && apiKey.startsWith('gpk_')) {
        logger.info('Chave pública AsgardPay validada com sucesso');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Erro ao sincronizar chaves AsgardPay:', error);
      return false;
    }
  }
}

export const paymentService = new PaymentService();