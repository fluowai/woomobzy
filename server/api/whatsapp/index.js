import { Router } from 'express';
import axios from 'axios';

const router = Router();

// A URL real da Evolution API (ajustável via .env)
const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'https://evolution.consultio.com.br';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

// Middleware para repassar todas as chamadas para a Evolution API
router.use(async (req, res) => {
  try {
    if (!process.env.EVOLUTION_API_URL) {
      return res.status(500).json({
        error: 'Configuração Ausente',
        message: 'A variável EVOLUTION_API_URL não foi definida no arquivo .env do servidor.'
      });
    }

    const targetUrl = `${process.env.EVOLUTION_API_URL}${req.path}`;
    console.log(`[WhatsApp Proxy] Forwarding ${req.method} to: ${targetUrl}`);
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      params: req.query,
      headers: {
        'apikey': process.env.EVOLUTION_API_KEY || '',
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 segundos de timeout
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('WhatsApp Proxy Error:', error.message);
    
    // Se for erro de DNS ou conexão recusada
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(502).json({
        error: 'Servidor de WhatsApp Inalcançável',
        message: `Não foi possível conectar em ${process.env.EVOLUTION_API_URL}. Verifique se o endereço está correto.`
      });
    }

    res.status(error.response?.status || 500).json({
      error: 'Erro na comunicação com o WhatsApp',
      message: error.message,
      details: error.response?.data
    });
  }
});

export default router;
