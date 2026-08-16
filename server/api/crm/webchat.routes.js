import express from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';

const router = express.Router();

// Initialize or get session
router.post('/init', async (req, res) => {
  try {
    const { visitor_id, name, email, phone, organization_id } = req.body;

    const supabase = getSupabaseServer();
    let { data: session, error } = await supabase
      .from('webchat_sessions')
      .select('*')
      .eq('visitor_id', visitor_id)
      .eq('organization_id', organization_id)
      .maybeSingle();

    if (error) throw error;

    if (!session) {
      const { data: newSession, error: createError } = await supabase
        .from('webchat_sessions')
        .insert({
          visitor_id,
          name,
          email,
          phone,
          organization_id,
        })
        .select()
        .single();

      if (createError) throw createError;
      session = newSession;
    }

    res.json(session);
  } catch (err) {
    console.error('[WebChat] Init error:', err.message);
    res.status(500).json({ error: 'Erro ao iniciar chat' });
  }
});

// Send message from visitor
router.post('/messages', async (req, res) => {
  try {
    const { session_id, content } = req.body;

    const supabase = getSupabaseServer();
    const { data: message, error } = await supabase
      .from('webchat_messages')
      .insert({
        session_id,
        sender_type: 'visitor',
        content,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('webchat_sessions')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', session_id);

    res.json(message);
  } catch (err) {
    console.error('[WebChat] Message error:', err.message);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

// Get messages for a session
router.get('/messages/:sessionId', async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('webchat_messages')
      .select('*')
      .eq('session_id', req.params.sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar mensagens' });
  }
});

export default router;
