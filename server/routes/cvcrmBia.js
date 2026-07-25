import express from 'express';
import { handleCvcrmWebhook, handleBiaWebhook } from '../services/cvcrmBiaService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Webhook recebido do CVcrm (por exemplo, quando um novo Lead é criado)
 * Rota: POST /api/cvcrm-bia/webhook/cvcrm/:tenantId
 */
router.post('/webhook/cvcrm/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const payload = req.body;
    
    // Processa assincronamente (ou aguarda conforme necessidade de negócio)
    await handleCvcrmWebhook(tenantId, payload);
    
    // Responde rapidamente ao webhook para não causar timeout no CVcrm
    res.status(200).json({ success: true, message: 'Webhook recebido com sucesso' });
  } catch (error) {
    logger.error(`[CVCrm Webhook Route] Erro: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error processing webhook' });
  }
});

/**
 * Webhook recebido da BIA (por exemplo, resumo do atendimento finalizado)
 * Rota: POST /api/cvcrm-bia/webhook/bia/:tenantId
 */
router.post('/webhook/bia/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const payload = req.body;
    
    await handleBiaWebhook(tenantId, payload);
    
    res.status(200).json({ success: true, message: 'Webhook BIA processado e histórico atualizado no CVcrm' });
  } catch (error) {
    logger.error(`[BIA Webhook Route] Erro: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error processing BIA webhook' });
  }
});

export default router;
