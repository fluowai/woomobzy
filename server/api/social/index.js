import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import logger from '../../utils/logger.js';

const router = Router();

// Endpoint para conectar conta do Facebook/Instagram
router.post('/connect/facebook', async (req, res) => {
  try {
    const { account_id, access_token, expires_at } = req.body;
    const orgId = req.orgId;

    if (req.body?.org_id && req.body.org_id !== orgId) {
      return res.status(403).json({ error: 'Acesso negado: organização divergente' });
    }

    if (!orgId || !account_id || !access_token) {
      return res.status(400).json({ error: 'Faltando parâmetros obrigatórios' });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('social_accounts')
      .upsert(
        {
          org_id: orgId,
          platform: 'facebook',
          account_id,
          access_token,
          expires_at,
          updated_at: new Date(),
        },
        { onConflict: 'org_id,platform,account_id' }
      )
      .select()
      .single();

    if (error) throw error;

    logger.info(`Conta social conectada para a org ${orgId}`, { account_id });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Erro ao conectar conta social', { error: err });
    res.status(500).json({ error: 'Erro interno ao salvar conta' });
  }
});

// Endpoint para agendar um post
router.post('/posts', async (req, res) => {
  try {
    const { property_id, content, media_urls, platforms, scheduled_for } = req.body;
    const orgId = req.orgId;

    if (req.body?.org_id && req.body.org_id !== orgId) {
      return res.status(403).json({ error: 'Acesso negado: organização divergente' });
    }

    if (!orgId || !content || !scheduled_for) {
      return res.status(400).json({ error: 'Faltando parâmetros obrigatórios' });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('social_posts')
      .insert([
        {
          org_id: orgId,
          property_id: property_id || null,
          content,
          media_urls: Array.isArray(media_urls) ? media_urls : [],
          platforms: Array.isArray(platforms) && platforms.length ? platforms : ['instagram'],
          scheduled_for,
          status: 'scheduled',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    logger.info(`Post agendado para a org ${orgId}`, { post_id: data.id });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Erro ao agendar post', { error: err });
    res.status(500).json({ error: 'Erro interno ao agendar post' });
  }
});

// Endpoint para buscar agendamentos da própria organização
router.get('/posts', async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('org_id', req.orgId)
      .order('scheduled_for', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Erro ao buscar posts', { error: err });
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Endpoint legado compatível, validando estritamente o tenant da sessão
router.get('/posts/:org_id', async (req, res) => {
  try {
    const { org_id } = req.params;
    if (org_id !== req.orgId) {
      return res.status(403).json({ error: 'Acesso negado para esta organização' });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('org_id', req.orgId)
      .order('scheduled_for', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Erro ao buscar posts', { error: err });
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
