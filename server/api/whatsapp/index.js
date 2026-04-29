import { Router } from 'express';
import axios from 'axios';

const router = Router();

// A URL real da Evolution API (ajustável via .env)
const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'https://evolution.consultio.com.br';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

// Middleware para repassar todas as chamadas para a Evolution API
router.all('*', async (req, res) => {
  try {
    const targetUrl = `${EVOLUTION_URL}${req.path}`;
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      params: req.query,
      headers: {
        'apikey': EVOLUTION_KEY,
        'Content-Type': 'application/json'
      }
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('WhatsApp Proxy Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Erro na comunicação com o servidor de WhatsApp',
      message: error.message
    });
  }
});

export default router;
