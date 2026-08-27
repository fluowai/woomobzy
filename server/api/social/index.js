import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import logger from '../../utils/logger.js';

const router = Router();

// Endpoint para conectar conta do Facebook/Instagram
router.post('/connect/facebook', async (req, res) => {
    try {
        const { org_id, account_id, access_token, expires_at } = req.body;
        
        if (!org_id || !account_id || !access_token) {
            return res.status(400).json({ error: 'Faltando parâmetros obrigatórios' });
        }

        const supabase = getSupabaseServer();
        const { data, error } = await supabase
            .from('social_accounts')
            .upsert(
                {
                    org_id,
                    platform: 'facebook',
                    account_id,
                    access_token,
                    expires_at,
                    updated_at: new Date()
                },
                { onConflict: 'org_id,platform,account_id' }
            )
            .select()
            .single();

        if (error) throw error;
        
        logger.info(`Conta social conectada para a org ${org_id}`, { account_id });
        res.json({ success: true, data });
    } catch (err) {
        logger.error('Erro ao conectar conta social', { error: err });
        res.status(500).json({ error: 'Erro interno ao salvar conta' });
    }
});

// Endpoint para agendar um post
router.post('/posts', async (req, res) => {
    try {
        const { org_id, property_id, content, media_urls, platforms, scheduled_for } = req.body;
        
        if (!org_id || !content || !scheduled_for) {
            return res.status(400).json({ error: 'Faltando parâmetros obrigatórios' });
        }

        const supabase = getSupabaseServer();
        const { data, error } = await supabase
            .from('social_posts')
            .insert([
                {
                    org_id,
                    property_id,
                    content,
                    media_urls,
                    platforms,
                    scheduled_for,
                    status: 'scheduled'
                }
            ])
            .select()
            .single();

        if (error) throw error;
        
        logger.info(`Post agendado para a org ${org_id}`, { post_id: data.id });
        res.json({ success: true, data });
    } catch (err) {
        logger.error('Erro ao agendar post', { error: err });
        res.status(500).json({ error: 'Erro interno ao agendar post' });
    }
});

// Endpoint para buscar agendamentos
router.get('/posts/:org_id', async (req, res) => {
    try {
        const { org_id } = req.params;
        
        const supabase = getSupabaseServer();
        const { data, error } = await supabase
            .from('social_posts')
            .select('*')
            .eq('org_id', org_id)
            .order('scheduled_for', { ascending: true });

        if (error) throw error;
        
        res.json({ success: true, data });
    } catch (err) {
        logger.error('Erro ao buscar posts', { error: err });
        res.status(500).json({ error: 'Erro interno' });
    }
});

export default router;
