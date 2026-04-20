/**
 * server/api/whatsapp/index.js — Rotas da API WhatsApp
 *
 * CORREÇÕES CRÍTICAS:
 *   - Todas as rotas verificam estado REAL do socket (não apenas DB)
 *   - /connect detecta socket morto e reconecta automaticamente
 *   - /qr nunca retorna "connected" se socket não está vivo
 *   - Respostas padronizadas com `socket_alive` para o frontend
 */

import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { sessionManager } from '../../baileys/index.js';
import { WA_STATES } from '../../baileys/StateMachine.js';
import { verifyAdmin } from '../../middleware/auth.js';

const router = Router();
const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Retorna o status real combinando banco + estado em memória.
 * O socket vivo tem prioridade sobre o que está salvo no banco.
 */
function getRealStatus(dbInstance) {
  const socketAlive = sessionManager.isSessionAlive(dbInstance.id);
  const memoryState = sessionManager.getSessionState(dbInstance.id);

  // Só força 'reconnecting' se o DB diz connected E a memória diz que REALMENTE desconectou.
  // Se estiver em estado STALE ou CONNECTED na memória, mantemos o rótulo do DB para evitar flicker.
  if (dbInstance.status === 'connected' && !socketAlive && memoryState === WA_STATES.DISCONNECTED) {
    return { ...dbInstance, status: 'reconnecting', socket_alive: false, memoryState };
  }

  const res = {
    ...dbInstance,
    socket_alive: socketAlive,
    memoryState,
  };
  return res;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CRUD de Instâncias
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** POST /api/whatsapp/instances — Criar nova instância */
router.post('/instances', verifyAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });

    const { data, error } = await supabase
      .from('whatsapp_instances')
      .insert({ organization_id: req.orgId, name: name.trim(), status: 'disconnected' })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, instance: getRealStatus(data) });
  } catch (e) {
    console.error('[WhatsApp API] Erro ao criar instância:', e);
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/whatsapp/instances — Listar instâncias da organização */
router.get('/instances', verifyAdmin, async (req, res) => {
  try {
    let query = supabase
      .from('whatsapp_instances')
      .select('*')
      .order('created_at', { ascending: false });

    // Se NÃO for superadmin, ou se for superadmin e estiver impersonando, filtra por orgId
    if (req.userRole !== 'superadmin' || req.isImpersonating) {
      query = query.eq('organization_id', req.orgId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Enriquece cada instância com estado real do socket
    const instances = (data || []).map(getRealStatus);

    res.json({ success: true, instances });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/whatsapp/instances/:id — Buscar instância específica */
router.get('/instances/:id', verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Instância não encontrada' });

    res.json({ success: true, instance: getRealStatus(data) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** DELETE /api/whatsapp/instances/:id — Remover instância */
router.delete('/instances/:id', verifyAdmin, async (req, res) => {
  try {
    const instanceId = req.params.id;

    // Verifica se pertence à organização
    const { data, error: findErr } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('id', instanceId)
      .eq('organization_id', req.orgId)
      .single();

    if (findErr || !data) return res.status(404).json({ error: 'Instância não encontrada' });

    // Faz logout completo (limpa socket + arquivos + banco)
    await sessionManager.logout(instanceId);

    // Remove do banco de dados
    const { error: delErr } = await supabase
      .from('whatsapp_instances')
      .delete()
      .eq('id', instanceId)
      .eq('organization_id', req.orgId);

    if (delErr) throw delErr;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Conexão
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * POST /api/whatsapp/instances/:id/connect — Iniciar conexão
 *
 * LÓGICA CRÍTICA:
 *   1. Se socket está VIVO e DB diz connected → retorna conectado (nada a fazer)
 *   2. Se DB diz connected mas socket está MORTO → reconecta automaticamente
 *   3. Caso contrário → inicia nova sessão
 */
router.post('/instances/:id/connect', verifyAdmin, async (req, res) => {
  try {
    const instanceId = req.params.id;

    const { data: instance, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId)
      .eq('organization_id', req.orgId)
      .single();

    if (error || !instance) return res.status(404).json({ error: 'Inst\u00e2ncia n\u00e3o encontrada' });

    const socketAlive = sessionManager.isSessionAlive(instanceId);

    // Caso 1: Genuinamente conectado
    if (instance.status === 'connected' && socketAlive) {
      return res.json({
        success: true,
        status: 'connected',
        socket_alive: true,
        phoneNumber: instance.phone_number,
      });
    }

    // Caso 2: DB diz connected mas socket morreu → reconex\u00e3o autom\u00e1tica
    if (instance.status === 'connected' && !socketAlive) {
      console.log(`[WhatsApp API] \uD83D\uDD04 Socket morto para ${instanceId}. Reconectando automaticamente...`);
      sessionManager.startSession(instanceId, req.orgId).catch(e => {
        console.error(`[WhatsApp API] \u274C Falha na reconex\u00e3o de ${instanceId}:`, e.message);
      });
      return res.json({ success: true, status: 'reconnecting', socket_alive: false });
    }

    // Caso 3: status = 'reconnecting' (usu\u00e1rio clicou "For\u00e7ar Reconex\u00e3o")
    // For\u00e7a reset completo da sess\u00e3o presa
    if (instance.status === 'reconnecting') {
      console.log(`[WhatsApp API] \uD83D\uDD04 For\u00e7ando reset de sess\u00e3o presa: ${instanceId}`);
      // 1. Atualiza banco para disconnected para limpar o estado preso
      await supabase
        .from('whatsapp_instances')
        .update({ status: 'disconnected', updated_at: new Date().toISOString() })
        .eq('id', instanceId);
      // 2. Derruba qualquer sess\u00e3o em mem\u00f3ria
      const existingSession = sessionManager.getSession(instanceId);
      if (existingSession) {
        await sessionManager.logout(instanceId);
      }
      // 3. Inicia nova sess\u00e3o
      sessionManager.startSession(instanceId, req.orgId).catch(e => {
        console.error(`[WhatsApp API] \u274C Falha no reset de ${instanceId}:`, e.message);
      });
      return res.json({ success: true, status: 'connecting' });
    }

    // Caso 4: Novo in\u00edcio de sess\u00e3o (pending, disconnected, etc.)
    sessionManager.startSession(instanceId, req.orgId).catch(e => {
      console.error(`[WhatsApp API] \u274C Falha ao iniciar sess\u00e3o ${instanceId}:`, e.message);
    });
    res.json({ success: true, status: 'connecting' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/whatsapp/instances/:id/qr — Obter QR Code
 *
 * LÓGICA CRÍTICA:
 *   - Verifica socket REAL, não apenas DB
 *   - Se connected + socket vivo → retorna connected
 *   - Se connected + socket morto → inicia reconexão + retorna reconnecting
 */
router.get('/instances/:id/qr', verifyAdmin, async (req, res) => {
  try {
    const instanceId = req.params.id;

    const { data: instance, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId)
      .eq('organization_id', req.orgId)
      .single();

    if (error || !instance) return res.status(404).json({ error: 'Instância não encontrada' });

    const socketAlive = sessionManager.isSessionAlive(instanceId);

    // Socket vivo e conectado → retorna status real
    if (instance.status === 'connected' && socketAlive) {
      return res.json({
        success: true,
        status: 'connected',
        socket_alive: true,
        phoneNumber: instance.phone_number,
      });
    }

    // DB diz connected mas socket morreu → reconectar silenciosamente
    if (instance.status === 'connected' && !socketAlive) {
      console.log(`[WhatsApp API] 🔄 /qr: socket morto para ${instanceId}. Iniciando reconexão...`);
      sessionManager.startSession(instanceId, req.orgId).catch(() => {});
      return res.json({ success: true, status: 'reconnecting', socket_alive: false });
    }

    // Instância desconectada ou pendente → inicia sessão (vai gerar QR)
    if (['disconnected', 'pending'].includes(instance.status)) {
      const existingSession = sessionManager.getSession(instanceId);
      if (!existingSession) {
        sessionManager.startSession(instanceId, req.orgId).catch(() => {});
      }
    }

    // Retorna QR Code se disponível no DB (Realtime vai entregar ao frontend)
    if (instance.qr_code) {
      return res.json({
        success: true,
        status: 'qr_pending',
        qrCode: instance.qr_code,
        socket_alive: false,
      });
    }

    // QR ainda sendo gerado
    res.json({ success: true, status: 'generating_qr', socket_alive: false });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/whatsapp/instances/:id/disconnect — Desconectar instância */
router.post('/instances/:id/disconnect', verifyAdmin, async (req, res) => {
  try {
    const instanceId = req.params.id;

    // Verifica ownership
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('id', instanceId)
      .eq('organization_id', req.orgId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Instância não encontrada' });

    await sessionManager.logout(instanceId);
    res.json({ success: true, status: 'disconnected' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mensagens e Chats
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** DELETE /api/whatsapp/messages/:id — Deletar mensagem do painel */
router.delete('/messages/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Garante que a mensagem pertence à organização (Join com chats)
    const { data: msg, error: fetchErr } = await supabase
      .from('whatsapp_messages')
      .select(`
        id,
        instance_id,
        whatsapp_instances!inner(organization_id)
      `)
      .eq('id', id)
      .single();

    if (fetchErr || !msg) return res.status(404).json({ error: 'Mensagem não encontrada' });
    
    // Verifica se a organização coincide
    if (msg.whatsapp_instances.organization_id !== req.orgId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { error: delErr } = await supabase
      .from('whatsapp_messages')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;

    res.json({ success: true });
  } catch (e) {
    console.error('[WhatsApp API] Erro ao deletar mensagem:', e);
    res.status(500).json({ error: e.message });
  }
});

/** DELETE /api/whatsapp/chats/:chatId/messages — Limpar todo o histórico de um chat */
router.delete('/chats/:chatId/messages', verifyAdmin, async (req, res) => {
  try {
    const { chatId } = req.params;

    // Valida se o chat pertence à organização
    const { data: chat, error: fetchErr } = await supabase
      .from('whatsapp_chats')
      .select('id, organization_id')
      .eq('id', chatId)
      .single();

    if (fetchErr || !chat) return res.status(404).json({ error: 'Chat não encontrado' });
    if (chat.organization_id !== req.orgId) return res.status(403).json({ error: 'Acesso negado' });

    const { error: delErr } = await supabase
      .from('whatsapp_messages')
      .delete()
      .eq('chat_id', chatId);

    if (delErr) throw delErr;

    res.json({ success: true });
  } catch (e) {
    console.error('[WhatsApp API] Erro ao limpar conversa:', e);
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/whatsapp/instances/:id/chats */
router.get('/instances/:id/chats', verifyAdmin, async (req, res) => {
  try {
    // 1. Busca os chats
    const { data: chats, error: chatErr } = await supabase
      .from('whatsapp_chats')
      .select('*')
      .eq('instance_id', req.params.id)
      .order('last_message_at', { ascending: false })
      .limit(100);

    if (chatErr) throw chatErr;

    // 2. Busca leads da organização para fazer o vínculo de nomes
    const { data: leads } = await supabase
      .from('leads')
      .select('name, classification, chat_jid')
      .eq('organization_id', req.orgId);

    // 3. Mapeia leads para os chats (Vínculo de Inteligência)
    const enrichedChats = (chats || []).map(chat => {
      const lead = (leads || []).find(l => l.chat_jid === chat.jid);
      return {
        ...chat,
        name: lead?.name || chat.name, // Prioriza o nome do Lead se existir
        lead_info: lead ? { classification: lead.classification } : null
      };
    });

    res.json({ success: true, chats: enrichedChats });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/whatsapp/instances/:id/chats/:chatId/messages */
router.get('/instances/:id/chats/:chatId/messages', verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('instance_id', req.params.id)
      .eq('chat_id', req.params.chatId)
      .order('timestamp', { ascending: true })
      .limit(200);

    if (error) throw error;
    res.json({ success: true, messages: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/whatsapp/instances/:id/send — Enviar mensagem */
router.post('/instances/:id/send', verifyAdmin, async (req, res) => {
  try {
    const { jid, text } = req.body;
    if (!jid || !text) return res.status(400).json({ error: 'jid e text são obrigatórios' });

    const instanceId = req.params.id;

    // Verificar ownership e status
    const { data: instance, error } = await supabase
      .from('whatsapp_instances')
      .select('id, status')
      .eq('id', instanceId)
      .eq('organization_id', req.orgId)
      .single();

    if (error || !instance) return res.status(404).json({ error: 'Instância não encontrada' });

    // ── Verificação de socket DIRETA ────────────────────────────────────────
    const session = sessionManager.getSession(instanceId);
    
    if (!session || session.status !== 'conectado') {
      console.warn(`[WhatsApp API] ❌ /send bloqueado: instância não está conectada. Status atual: ${session?.status}`);
      return res.status(400).json({
        error: 'Instância offline ou desconectada. Por favor, aguarde a reconexão.',
        socket_alive: false,
        state: session?.status || 'desconectado'
      });
    }

    const formattedJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;
    const result = await sessionManager.sendMessage(instanceId, formattedJid, text);

    res.json({ success: true, messageId: result.key.id });
  } catch (e) {
    console.error('[WhatsApp API] Erro ao enviar mensagem:', e);
    res.status(500).json({ error: e.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Diagnóstico
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** GET /api/whatsapp/debug — Auditoria do sistema */
router.get('/debug', verifyAdmin, async (req, res) => {
  try {
    const memoryStates = sessionManager.getAllSessionStates();

    const [msgResult, chatResult, instResult, lastMsgs] = await Promise.all([
      supabase.from('whatsapp_messages').select('id', { count: 'exact', head: true }),
      supabase.from('whatsapp_chats').select('id', { count: 'exact', head: true }),
      supabase.from('whatsapp_instances').select('id, name, status', { count: 'exact' }),
      supabase.from('whatsapp_messages').select('id, content, created_at, instance_id').order('created_at', { ascending: false }).limit(5),
    ]);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      memory: {
        active_sessions: Object.keys(memoryStates).length,
        sessions: memoryStates,
      },
      database: {
        total_messages: msgResult.count || 0,
        total_chats: chatResult.count || 0,
        instances: instResult.data || [],
      },
      last_messages: lastMsgs.data || [],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/whatsapp/health — Health check das sessões */
router.get('/health', verifyAdmin, async (req, res) => {
  try {
    const states = sessionManager.getAllSessionStates();
    const connectedCount = Object.values(states).filter(s => s.alive).length;
    res.json({
      success: true,
      healthy: true,
      active_sessions: Object.keys(states).length,
      connected_sockets: connectedCount,
      sessions: states,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
