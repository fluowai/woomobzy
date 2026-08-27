import crypto from 'crypto';

class AsaasGateway {
  constructor() {
    this.apiKey = process.env.ASAAS_API_KEY || 'mock_key';
    this.apiUrl =
      process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
  }

  async createCharge(customerInfo, billingInfo) {
    console.log('[ASAAS] Creating charge for', customerInfo?.name);

    const fakeId = 'pay_' + crypto.randomBytes(6).toString('hex');
    return {
      id: fakeId,
      status: 'PENDING',
      invoiceUrl: `https://sandbox.asaas.com/i/${fakeId}`,
      pix: {
        payload: '00020126580014br.gov.bcb.pix...',
        encodedImage: 'base64_image_data_here',
      },
      bankSlip: {
        identificationField:
          '34191.09008 00000.000000 00000.000000 0 00000000000000',
        barCode: '341910000000000000009000000000000000000000000',
      },
    };
  }

  async handleWebhook(payload) {
    if (payload.event === 'PAYMENT_RECEIVED') {
      const paymentId = payload.payment.id;
      const amountPaid = payload.payment.value;
      console.log(`[ASAAS] Payment ${paymentId} received! Processing Split...`);

      return this.processSplitPayment(paymentId, amountPaid);
    }
    return { success: true, action: 'IGNORED' };
  }

  async processSplitPayment(paymentId, amount) {
    // Imobiliária retém 10%
    const adminFeePercentage = 0.1;
    const adminFee = amount * adminFeePercentage;
    const ownerTransfer = amount - adminFee;

    console.log(`[SPLIT SYSTEM] Fatura de ${amount} Paga.`);
    console.log(`[SPLIT SYSTEM] Taxa Imobiliária (10%): ${adminFee}`);
    console.log(
      `[SPLIT SYSTEM] Gerando "Contas a Pagar" pro proprietário: ${ownerTransfer}`
    );

    return {
      success: true,
      action: 'SPLIT_PROCESSED',
      adminFee,
      ownerTransfer,
    };
  }
}

export default new AsaasGateway();
