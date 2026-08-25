import { Router } from 'express';
import { verifyAuth } from '../../middleware/auth.js';
import { verifyMegaAdmin } from '../../middleware/auth.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import logger from '../../utils/logger.js';
import asgardpay, { AsgardPayService } from '../../services/asgardpayService.js';

const router = Router();

// Middleware para webhook - parse como texto para acessar o corpo bruto
// O corpo bruto será capturado no handler usando req.body como string
router.use('/webhook', express.text({ type: '*/*' }));

async function getOrgAsgardPayKeys(orgId) {
  try {
    const supabase = getSupabaseServer();
    const { data: org } = await supabase
      .from('organizations')
      .select('asgardpay_public_key, asgardpay_secret_key')
      .eq('id', orgId)
      .single();

    if (org?.asgardpay_public_key && org?.asgardpay_secret_key) {
      return {
        publicKey: org.asgardpay_public_key,
        secretKey: org.asgardpay_secret_key,
      };
    }

    // Fall back to global saas_settings
    const { data: settings } = await supabase
      .from('saas_settings')
      .select('asgardpay_public_key, asgardpay_secret_key')
      .single();

    if (settings?.asgardpay_public_key && settings.asgardpay_secret_key) {
      return {
        publicKey: settings.asgardpay_public_key,
        secretKey: settings.asgardpay_secret_key,
      };
    }

    return null;
  } catch (error) {
    logger.error('Erro ao buscar chaves AsgardPay da organização:', error);
    return null;
  }
}

router.post(
  '/create-payment',
  verifyAuth,
  verifyMegaAdmin,
  async (req, res) => {
    try {
      const {
        clientId,
        amount,
        description,
        dueDate,
        type = 'pix'
      } = req.body;

      if (!clientId || !amount || !description || !dueDate) {
        return res.status(400).json({
          success: false,
          error: 'Dados obrigatórios faltando: clientId, amount, description, dueDate',
        });
      }

      const supabase = getSupabaseServer();

      // Verificar se o cliente existe e pertence a uma organização
      const { data: client } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .single();

      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Cliente não encontrado',
        });
      }

      // Obter chaves AsgardPay da organização (ou global)
      const orgKeys = await getOrgAsgardPayKeys(client.organization_id || '');
      const asgardpayService = orgKeys
        ? new asgardpay.AsgardPayService(orgKeys)
        : new asgardpay.AsgardPayService();

      // Criar cobrança no AsgardPay
      const paymentResult = await asgardpayService.createPayment({
        clientId: client.id,
        clientEmail: client.email,
        clientName: client.name || client.email,
        amount,
        description,
        dueDate,
        type,
      });

      // Salvar no banco de dados
      const { data: billing, error } = await supabase
        .from('billing')
        .insert({
          organization_id: client.organization_id,
          contract_id: client.contract_id,
          amount,
          due_date: dueDate,
          description,
          status: 'aberto',
          payment_gateway_id: paymentResult.id,
          pix_code: paymentResult.pixCode || null,
          invoice_url: paymentResult.invoiceUrl || null,
        })
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data: billing,
        payment: paymentResult,
      });
    } catch (error) {
      console.error('Erro ao criar pagamento AsgardPay:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao criar pagamento',
      });
    }
  }
);

/**
 * GET /api/asgardpay/payment-status/:id
 * Consultar status do pagamento
 * Apenas mega admin pode acessar
 */
router.get(
  '/payment-status/:id',
  verifyAuth,
  verifyMegaAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Obter chaves da organização para consulta de status
      const orgId = req.orgId;
      const orgKeys = orgId ? await getOrgAsgardPayKeys(orgId) : null;
      const paymentService = orgKeys
        ? new asgardpay.AsgardPayService(orgKeys)
        : new asgardpay.AsgardPayService();

      const paymentResult = await paymentService.getPaymentStatus(id);

      res.json({
        success: true,
        data: paymentResult,
      });
    } catch (error) {
      console.error('Erro ao consultar status do pagamento:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao consultar status',
      });
    }
  }
);

/**
 * POST /api/asgardpay/webhook
 * Webhook handler para notificações de pagamento
 * Esta rota não precisa de auth mega admin, mas tem validação de assinatura
 */
router.post(
  '/webhook',
  async (req, res) => {
    try {
      const webhookSig = req.headers['x-asgardpay-signature'];
      const webhookEvent = req.body;
      // Usar JSON.stringify do corpo parsed para verificação de assinatura
      // Isso funciona se a AsgardPay calcular o HMAC sobre o corpo JSON
      const rawBody = JSON.stringify(webhookEvent);

      // Validar assinatura do webhook
      const isValid = await asgardpay.verifyWebhookSignature(
        rawBody,
        webhookSig
      );

      if (!isValid) {
        return res.status(400).json({ error: 'Assinatura inválida' });
      }

      // Processar evento de pagamento
      const { type, data } = webhookEvent;

      if (type === 'payment.paid') {
        const { invoice_id, payment_id, amount, status } = data;

        // Atualizar status no banco
        const { error } = await supabase
          .from('billing')
          .update({
            status: 'pago',
            payment_date: new Date().toISOString().split('T')[0],
            observation: `Pagamento AsgardPay - ${payment_id}`,
          })
          .eq('payment_gateway_id', invoice_id);

        if (error) throw error;
      }

      if (type === 'payment.failed') {
        const { invoice_id, error_code, error_message } = data;

        const { error } = await supabase
          .from('billing')
          .update({
            status: 'cancelado',
            observation: `Falha no pagamento AsgardPay: ${error_message}`,
          })
          .eq('payment_gateway_id', invoice_id);

        if (error) throw error;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Erro no webhook AsgardPay:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;