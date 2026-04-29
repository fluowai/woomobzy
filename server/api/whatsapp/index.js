import { Router } from 'express';
import axios from 'axios';

const router = Router();

// A URL real da Evolution API (ajustável via .env)
const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'https://evolution.consultio.com.br';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

// Middleware para repassar todas as chamadas para o serviço WhatsMeow (Go)
router.use(async (req, res) => {
  try {
    const api_url = process.env.WHATSAPP_API_URL || process.env.VITE_WHATSAPP_API_URL;
    
    if (!api_url) {
      return res.status(500).json({
        error: 'Configuração Ausente',
        message: 'A variável WHATSAPP_API_URL não foi definida no arquivo .env.'
      });
    }

    // Monta a URL removendo o prefixo /api/whatsapp se necessário
    const targetUrl = `${api_url.replace(/\/$/, '')}${req.path}`;
    console.log(`[WhatsMeow Proxy] Forwarding ${req.method} to: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      params: req.query,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('WhatsApp Proxy Error:', error.message);
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(502).json({
        error: 'Serviço WhatsMeow Inalcançável',
        message: `Não foi possível conectar ao serviço de WhatsApp. Verifique se o servidor Go está rodando.`
      });
    }

    res.status(error.response?.status || 500).json({
      error: 'Erro no serviço WhatsMeow',
      message: error.message,
      details: error.response?.data
    });
  }
});

export default router;
