import express from 'express';
import asaasGateway from '../services/asaasGateway.js';

const router = express.Router();

router.post('/asaas', async (req, res) => {
  try {
    const payload = req.body;

    // Webhook auth headers exist here
    const result = await asaasGateway.handleWebhook(payload);

    res.status(200).json({ received: true, result });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to simulate webhook hit
router.post('/simulate-payment/:id', async (req, res) => {
  try {
    const paymentId = req.params.id;
    const amount = req.body.amount || 1500.0;

    const fakeWebhook = {
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: paymentId,
        value: amount,
      },
    };

    const result = await asaasGateway.handleWebhook(fakeWebhook);
    res.status(200).json({ success: true, split_result: result });
  } catch (error) {
    res.status(500).json({ error: 'Simulation Error' });
  }
});

export default router;
