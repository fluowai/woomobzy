import express from 'express';
import { getSupabaseServer } from '../lib/supabase-server.js';
import { isMinioConfigured } from '../lib/minio-storage.js';
import { checkWhatsAppService } from '../api/whatsapp/index.js';

const router = express.Router();

/**
 * Health check básico - sempre deve funcionar
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Health check profundo - verifica todos os serviços críticos
 */
router.get('/deep', async (req, res) => {
  const checks = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: { healthy: false, error: null },
      supabase: { healthy: false, error: null },
      storage: { healthy: false, error: null },
      whatsapp: { healthy: false, error: null },
    },
  };

  try {
    // Verificar Supabase
    try {
      const supabase = getSupabaseServer();
      const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);
      
      checks.services.supabase.healthy = !error;
      checks.services.supabase.error = error?.message || null;
    } catch (error) {
      checks.services.supabase.healthy = false;
      checks.services.supabase.error = error.message;
    }

    // Verificar banco de dados
    try {
      const supabase = getSupabaseServer();
      const { data, error } = await supabase.rpc('version');
      checks.services.database.healthy = !error;
      checks.services.database.error = error?.message || null;
    } catch (error) {
      checks.services.database.healthy = false;
      checks.services.database.error = error.message;
    }

    // Verificar storage (MinIO)
    try {
      checks.services.storage.healthy = isMinioConfigured();
      if (!checks.services.storage.healthy) {
        checks.services.storage.error = 'MinIO nao configurado';
      }
    } catch (error) {
      checks.services.storage.healthy = false;
      checks.services.storage.error = error.message;
    }

    // Verificar WhatsApp
    try {
      const whatsappTarget = process.env.WHATSMEOW_URL || 'http://127.0.0.1:3100';
      const service = await checkWhatsAppService(whatsappTarget);
      checks.services.whatsapp.healthy = service.ok;
      checks.services.whatsapp.error = service.ok ? null : service.error || 'Servico offline';
    } catch (error) {
      checks.services.whatsapp.healthy = false;
      checks.services.whatsapp.error = error.message;
    }

    // Calcular status geral
    const allHealthy = Object.values(checks.services).every(s => s.healthy);
    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json(checks);
  } catch (error) {
    console.error('[Health Check] Erro ao verificar servicos:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: checks.services,
    });
  }
});

/**
 * Health check do sistema de autenticação
 */
router.get('/auth', async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      return res.status(503).json({
        healthy: false,
        error: error.message,
        service: 'auth',
      });
    }

    res.json({
      healthy: true,
      profilesExist: !!data?.length,
      service: 'auth',
    });
  } catch (error) {
    res.status(500).json({
      healthy: false,
      error: error.message,
      service: 'auth',
    });
  }
});

export default router;
