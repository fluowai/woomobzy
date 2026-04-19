/**
 * SessionManager.js — Gerenciador do Ciclo de Vida das Sessões WhatsApp
 *
 * Responsabilidades:
 *   - Iniciar, restaurar e encerrar sessões Baileys
 *   - Controlar reconexões com backoff exponencial
 *   - Monitorar saúde dos sockets via heartbeat
 *   - Emitir eventos com suporte a múltiplos listeners (EventEmitter)
 *   - Garantir consistência de estado via StateMachine
 *   - Delegar persistência ao PersistenceManager
 */

import EventEmitter from 'events';
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import { createClient } from '@supabase/supabase-js';

import { ConnectionStateMachine, WA_STATES } from './StateMachine.js';
import { PersistenceManager } from './PersistenceManager.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constantes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const BACKOFF_DELAYS_MS = [1000, 5000, 15000, 30000, 60000];
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const WS_READY_STATE_OPEN = 1; // WebSocket.OPEN
const TERMINAL_DISCONNECT_CODES = new Set([
  DisconnectReason.loggedOut,     // 401
  DisconnectReason.forbidden,     // 403
  DisconnectReason.badSession,    // 500 (sessão corrompida)
  DisconnectReason.multideviceMismatch, // 411
]);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Estrutura de uma sessão gerenciada
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class ManagedSession {
  constructor(instanceId, organizationId) {
    this.instanceId = instanceId;
    this.organizationId = organizationId;
    this.sock = null;
    this.stateMachine = new ConnectionStateMachine(instanceId);
    this.retryCount = 0;
    this.retryTimer = null;
    this.isShuttingDown = false;
  }

  getNextBackoffDelay() {
    const idx = Math.min(this.retryCount, BACKOFF_DELAYS_MS.length - 1);
    return BACKOFF_DELAYS_MS[idx];
  }

  incrementRetry() {
    this.retryCount++;
  }

  resetRetry() {
    this.retryCount = 0;
  }

  clearRetryTimer() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Verifica se o socket WebSocket está genuinamente aberto.
   * Agora conta com uma tolerância: se a máquina de estados diz CONNECTED, 
   * daremos preferência ao estado lógico para evitar oscilações de UI.
   */
  isSocketAlive() {
    if (!this.sock) return false;
    
    // Tenta acessar o websocket de forma segura (Baileys pode encapsular)
    const ws = this.sock.ws;
    if (!ws) {
      // Se não temos acesso ao WS mas a máquina de estados diz que conectamos agorinha,
      // retornamos true para não quebrar a UI durante o handshake
      return this.stateMachine.is(WA_STATES.CONNECTED);
    }
    
    return ws.readyState === WS_READY_STATE_OPEN;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SessionManager
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class SessionManager extends EventEmitter {
  constructor(sessionsDir) {
    super();
    this.setMaxListeners(100); // Suporta muitas instâncias simultâneas
    this.sessions = new Map(); // instanceId → ManagedSession
    this.persistence = new PersistenceManager(sessionsDir);
    this._heartbeatTimer = null;
    this._baileysVersion = null; // Cache da versão
  }

  // ──────────────────────────────────────────────
  // Inicialização do Servidor
  // ──────────────────────────────────────────────
  /**
   * Chamado UMA VEZ no boot do servidor.
   * 1. Reseta instâncias "presas"
   * 2. Restaura apenas as genuinamente conectadas
   * 3. Inicia heartbeat
   */
  async boot() {
    console.log('[SessionManager] 🚀 Iniciando boot seguro...');
    const supabase = await this.persistence.getSupabaseClient();

    // ── PASSO 1: Limpar estado inconsistente ──────────
    const { error: resetErr } = await supabase
      .from('whatsapp_instances')
      .update({ status: 'disconnected', updated_at: new Date().toISOString() })
      .in('status', ['connecting', 'reconnecting', 'qr_pending']);

    if (resetErr) {
      console.warn('[SessionManager] ⚠️ Falha ao resetar instâncias presas:', resetErr.message);
    } else {
      console.log('[SessionManager] 🧹 Instâncias "presas" resetadas para disconnected.');
    }

    // ── PASSO 2: Restaurar sessões connected ──────────
    const { data: instances, error } = await supabase
      .from('whatsapp_instances')
      .select('id, name, organization_id')
      .eq('status', 'connected');

    if (error) {
      console.error('[SessionManager] ❌ Falha ao buscar instâncias conectadas:', error.message);
    } else {
      console.log(`[SessionManager] 📱 ${instances?.length || 0} instância(s) para restaurar.`);
      for (const instance of instances || []) {
        try {
          console.log(`[SessionManager] ♻️ Restaurando: ${instance.name} (${instance.id})`);
          await this.startSession(instance.id, instance.organization_id);
        } catch (err) {
          console.error(`[SessionManager] ❌ Falha ao restaurar ${instance.id}:`, err.message);
          await this.persistence.updateStatus(instance.id, 'disconnected');
        }
      }
    }

    // ── PASSO 3: Iniciar heartbeat ──────────────────
    this._startHeartbeat();
    console.log('[SessionManager] ✅ Boot completo.');
  }

  // ──────────────────────────────────────────────
  // Busca versão do Baileys com cache
  // ──────────────────────────────────────────────
  async _getBaileysVersion() {
    if (this._baileysVersion) return this._baileysVersion;
    try {
      const { version } = await fetchLatestBaileysVersion();
      this._baileysVersion = version;
      console.log(`[SessionManager] 🛠️ Versão Baileys: v${version.join('.')}`);
    } catch {
      this._baileysVersion = [2, 2413, 1]; // Versão estável mais recente (Março 2024)
      console.warn(`[SessionManager] ⚠️ Usando versão fallback estável: v${this._baileysVersion.join('.')}`);
    }
    return this._baileysVersion;
  }

  // ──────────────────────────────────────────────
  // Iniciar / Restaurar Sessão
  // ──────────────────────────────────────────────
  /**
   * Inicia ou restaura uma sessão WhatsApp.
   * Pode ser chamado tanto no boot quanto quando o usuário clica "Conectar".
   */
  async startSession(instanceId, organizationId) {
    // Se já existe uma sessão ativa para este ID, encerra antes
    const existing = this.sessions.get(instanceId);
    if (existing) {
      if (existing.isSocketAlive()) {
        console.log(`[SessionManager] ℹ️ Sessão ${instanceId} já está ativa. Ignorando.`);
        return;
      }
      await this._teardownSocket(existing);
    }

    // Cria nova sessão gerenciada
    const session = new ManagedSession(instanceId, organizationId);
    this.sessions.set(instanceId, session);

    // Tenta conectar
    await this._connect(session);
  }

  // ──────────────────────────────────────────────
  // Conexão Principal (Baileys)
  // ──────────────────────────────────────────────
  async _connect(session) {
    const { instanceId, organizationId } = session;

    if (session.isShuttingDown) {
      console.log(`[SessionManager] 🛑 Sessão ${instanceId} está encerrando. Cancelando conexão.`);
      return;
    }

    session.stateMachine.transition(WA_STATES.CONNECTING, 'iniciando conexão');
    await this.persistence.updateStatus(instanceId, 'connecting');

    const sessionPath = this.persistence.getSessionPath(instanceId);

    // Garante que as credenciais estão no FS (FS ou DB fallback)
    const hasCredentials = await this.persistence.ensureSessionReady(instanceId);
    console.log(`[SessionManager] 🔑 Credenciais para ${instanceId}: ${hasCredentials ? 'existem' : 'ausentes (vai gerar QR)'}`);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const version = await this._getBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['Chrome (Linux)', '', ''],
      syncFullHistory: false,
      markOnline: true,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      retryRequestDelayMs: 2000,
      getMessage: async () => ({ conversation: '' }),
    });

    session.sock = sock;

    // ── Evento: Credenciais Atualizadas ──────────────
    sock.ev.on('creds.update', async () => {
      try {
        await saveCreds(); // Baileys salva no FS (fonte de verdade)
        this.persistence.scheduleDBSync(instanceId); // Sincroniza com DB (debounced + mutex)
      } catch (e) {
        console.error(`[SessionManager] ❌ Erro em creds.update para ${instanceId}:`, e.message);
      }
    });

    // ── Evento: Atualização de Conexão ───────────────
    sock.ev.on('connection.update', async (update) => {
      await this._handleConnectionUpdate(session, update, saveCreds);
    });

    // ── Evento: Mensagens ────────────────────────────
    sock.ev.on('messages.upsert', async (m) => {
      for (const message of m.messages) {
        if (message?.key?.remoteJid) {
          await this._saveMessage(instanceId, message);
          this.emit(`message:${instanceId}`, message);
          this.emit('message', { instanceId, message });
        }
      }
    });

    // ── Evento: Histórico ────────────────────────────
    sock.ev.on('messaging-history.set', async ({ messages }) => {
      console.log(`[SessionManager] 📚 Histórico recebido: ${messages.length} msgs para ${instanceId}`);
      for (const message of messages) {
        if (message?.key?.remoteJid) {
          await this._saveMessage(instanceId, message);
        }
      }
    });
  }

  // ──────────────────────────────────────────────
  // Handler de Atualização de Conexão
  // ──────────────────────────────────────────────
  async _handleConnectionUpdate(session, update, saveCreds) {
    const { instanceId, organizationId } = session;
    const { connection, lastDisconnect, qr } = update;

    // ── QR Code ──────────────────────────────────────
    if (qr) {
      try {
        console.log(`[SessionManager] 📲 QR gerado para ${instanceId}`);
        session.stateMachine.transition(WA_STATES.QR_PENDING, 'QR gerado');
        const qrImage = await qrcode.toDataURL(qr);
        await this.persistence.saveQRCode(instanceId, qrImage);
        this.emit(`qr:${instanceId}`, qrImage);
        this.emit('qr', { instanceId, qrImage });
      } catch (e) {
        console.error(`[SessionManager] ❌ Erro ao processar QR de ${instanceId}:`, e.message);
      }
    }

    // ── Conexão Estabelecida ─────────────────────────
    if (connection === 'open') {
      console.log(`[SessionManager] ✅ Instância conectada: ${instanceId}`);
      const phoneNumber = session.sock?.user?.id?.split(':')[0]?.split('@')[0] || '';
      session.stateMachine.transition(WA_STATES.CONNECTED, 'socket aberto');
      session.resetRetry();
      await this.persistence.updateStatus(instanceId, 'connected', { phone_number: phoneNumber || null });
      this.emit(`connected:${instanceId}`, { phoneNumber });
      this.emit('connected', { instanceId, phoneNumber });
    }

    // ── Conexão Fechada ──────────────────────────────
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isTerminal = TERMINAL_DISCONNECT_CODES.has(statusCode);

      console.log(`[SessionManager] 🔌 Sessão ${instanceId} fechada. Código: ${statusCode}. Terminal: ${isTerminal}`);

      if (isTerminal) {
        // Desconexão definitiva (logout, sessão inválida, etc.)
        console.log(`[SessionManager] 🚫 Desconexão terminal para ${instanceId}. Limpando sessão.`);
        session.stateMachine.transition(WA_STATES.DISCONNECTED, `código terminal: ${statusCode}`);
        await this._teardownSocket(session);

        // Para código 401 (loggedOut): apaga creds completamente
        if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.badSession) {
          await this.persistence.clearSession(instanceId);
        } else {
          await this.persistence.updateStatus(instanceId, 'disconnected');
        }

        this.sessions.delete(instanceId);
        this.emit(`disconnected:${instanceId}`, { statusCode, terminal: true });
        this.emit('disconnected', { instanceId, statusCode, terminal: true });
      } else {
        // Desconexão transitória → tentar reconectar com backoff
        session.stateMachine.transition(WA_STATES.RECONNECTING, `código: ${statusCode}`);
        await this.persistence.updateStatus(instanceId, 'reconnecting');
        this.emit(`reconnecting:${instanceId}`, { statusCode });
        this.emit('reconnecting', { instanceId, statusCode });

        session.incrementRetry();
        const delay = session.getNextBackoffDelay();
        console.log(`[SessionManager] 🔄 Reconectando ${instanceId} em ${delay}ms (tentativa ${session.retryCount})`);

        session.clearRetryTimer();
        session.retryTimer = setTimeout(async () => {
          if (session.isShuttingDown) return;
          // Verifica se a sessão ainda é a mesma (não foi substituída)
          if (this.sessions.get(instanceId) !== session) return;
          await this._connect(session);
        }, delay);
      }
    }
  }

  // ──────────────────────────────────────────────
  // Encerramento de Socket
  // ──────────────────────────────────────────────
  async _teardownSocket(session) {
    session.clearRetryTimer();
    if (session.sock) {
      try {
        session.sock.ev.removeAllListeners('connection.update');
        session.sock.ev.removeAllListeners('creds.update');
        session.sock.ev.removeAllListeners('messages.upsert');
        session.sock.ev.removeAllListeners('messaging-history.set');
        if (session.isSocketAlive()) {
          session.sock.end();
        }
      } catch (e) {
        // Ignora erros ao fechar socket
      }
      session.sock = null;
    }
  }

  // ──────────────────────────────────────────────
  // Heartbeat
  // ──────────────────────────────────────────────
  _startHeartbeat() {
    if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);

    this._heartbeatTimer = setInterval(async () => {
      console.log(`[SessionManager] 🫀 Heartbeat — verificando ${this.sessions.size} sessão(ões)...`);

      for (const [instanceId, session] of this.sessions) {
        const state = session.stateMachine.getState();

        // Só verifica sessões que deveriam estar conectadas
        if (state !== WA_STATES.CONNECTED && state !== WA_STATES.STALE) continue;

        if (!session.isSocketAlive()) {
          // Se estava conectado mas o socket morreu, damos UMA chance extra de 30s 
          // antes de forçar reconexão, para evitar matar conexões em sync intenso
          if (state === WA_STATES.CONNECTED) {
             console.warn(`[SessionManager] ⚠️ Heartbeat: socket parece morto para ${instanceId}, mas está em estado CONNECTED. Aguardando próximo ciclo.`);
             session.stateMachine.transition(WA_STATES.STALE, 'instabilidade detectada pelo heartbeat');
             continue;
          }

          console.warn(`[SessionManager] ⚠️ Heartbeat: confirmada morte do socket para ${instanceId}. Reconectando...`);
          await this.persistence.updateStatus(instanceId, 'reconnecting');
          session.stateMachine.transition(WA_STATES.RECONNECTING, 'iniciando reconexão pelo heartbeat');
          session.clearRetryTimer();
          await this._connect(session);
        } else {
          console.log(`[SessionManager] ✅ Heartbeat: ${instanceId} OK`);
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  // ──────────────────────────────────────────────
  // Logout (encerramento manual)
  // ──────────────────────────────────────────────
  async logout(instanceId) {
    const session = this.sessions.get(instanceId);
    if (session) {
      session.isShuttingDown = true;
      if (session.sock && session.isSocketAlive()) {
        try {
          await session.sock.logout();
        } catch (e) {
          // Ignora erros de logout
        }
      }
      await this._teardownSocket(session);
      this.sessions.delete(instanceId);
    }
    await this.persistence.clearSession(instanceId);
    console.log(`[SessionManager] 👋 Logout completo para ${instanceId}`);
  }

  // ──────────────────────────────────────────────
  // Envio de Mensagem
  // ──────────────────────────────────────────────
  async sendMessage(instanceId, jid, text) {
    const session = this.sessions.get(instanceId);
    if (!session?.sock || !session.isSocketAlive()) {
      throw new Error(`Instância ${instanceId} não está conectada`);
    }
    const result = await session.sock.sendMessage(jid, { text });
    await this._saveMessage(instanceId, result);
    return result;
  }

  // ──────────────────────────────────────────────
  // Getters de Estado
  // ──────────────────────────────────────────────
  getSession(instanceId) {
    return this.sessions.get(instanceId) || null;
  }

  getSessionState(instanceId) {
    return this.sessions.get(instanceId)?.stateMachine.getState() || WA_STATES.DISCONNECTED;
  }

  isSessionAlive(instanceId) {
    return this.sessions.get(instanceId)?.isSocketAlive() || false;
  }

  getAllSessionStates() {
    const result = {};
    for (const [id, session] of this.sessions) {
      result[id] = {
        state: session.stateMachine.getState(),
        alive: session.isSocketAlive(),
        retryCount: session.retryCount,
      };
    }
    return result;
  }

  // ──────────────────────────────────────────────
  // Persistência de Mensagens
  // ──────────────────────────────────────────────
  async _saveMessage(instanceId, message) {
    try {
      const chatJid = message.key?.remoteJid;
      if (!chatJid || chatJid === 'status@broadcast' || chatJid.includes('@newsletter')) return;

      const session = this.sessions.get(instanceId);
      if (!session) return;
      
      const organizationId = session.organizationId;
      const supabase = await this.persistence.getSupabaseClient();
      const fromMe = message.key?.fromMe ?? false;
      const messageType = Object.keys(message.message || {})[0] || 'unknown';

      // Extração de conteúdo
      let content = '';
      const msg = message.message;
      if (msg?.conversation) content = msg.conversation;
      else if (msg?.extendedTextMessage?.text) content = msg.extendedTextMessage.text;
      else if (msg?.imageMessage?.caption) content = msg.imageMessage.caption;
      else if (msg?.videoMessage?.caption) content = msg.videoMessage.caption;
      else if (msg?.buttonsResponseMessage?.selectedButtonId) content = msg.buttonsResponseMessage.selectedButtonId;
      else if (msg?.listResponseMessage?.title) content = msg.listResponseMessage.title;
      else if (msg?.documentMessage?.caption) content = msg.documentMessage.caption;
      
      // Fallback para conteúdo de mídia sem legenda
      if (!content && ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(messageType)) {
        const labels = { imageMessage: '(Imagem)', videoMessage: '(Vídeo)', audioMessage: '(Áudio)', documentMessage: '(Arquivo)' };
        content = labels[messageType] || '(Mídia)';
      }
      
      // Detecção e Processamento de Mídia
      let mediaUrl = null;
      let mimeType = null;
      const mediaType = messageType.replace('Message', '');
      const isMedia = ['image', 'video', 'audio', 'document'].includes(mediaType);

      if (isMedia && session?.sock) {
        try {
          console.log(`[SessionManager] 📥 Baixando mídia: ${mediaType}...`);
          const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
          const buffer = await downloadMediaMessage(message, 'buffer', {});
          
          if (buffer) {
            const extensionMap = { 'image': 'jpg', 'video': 'mp4', 'audio': 'ogg', 'document': 'pdf' };
            const ext = extensionMap[mediaType] || 'bin';
            const fileName = `${instanceId}/${message.key.id}.${ext}`;
            const path = `messages/${fileName}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('imobzymsg')
              .upload(path, buffer, {
                contentType: msg[messageType]?.mimetype || 'application/octet-stream',
                upsert: true
              });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('imobzymsg').getPublicUrl(path);
            mediaUrl = publicUrl;
            mimeType = msg[messageType]?.mimetype;
            console.log(`[SessionManager] ✅ Mídia salva: ${mediaUrl}`);
          }
        } catch (mediaErr) {
          console.error(`[SessionManager] ❌ Erro ao processar mídia:`, mediaErr.message);
        }
      }

      // Garante que o chat existe (upsert)
      const { data: existingChat } = await supabase
        .from('whatsapp_chats')
        .select('id, name')
        .eq('instance_id', instanceId)
        .eq('jid', chatJid)
        .maybeSingle();

      let chatId;
      let displayName = (!fromMe && message.pushName) ? message.pushName : chatJid.split('@')[0];

      // Busca nome real de grupos
      if (chatJid.endsWith('@g.us')) {
        if (session?.sock) {
          try {
            const meta = await session.sock.groupMetadata(chatJid).catch(() => null);
            if (meta?.subject) displayName = meta.subject;
          } catch { /* noop */ }
        }
      }

      const timestamp = new Date((message.messageTimestamp || Date.now() / 1000) * 1000).toISOString();

      if (!existingChat) {
        const { data: newChat, error } = await supabase
          .from('whatsapp_chats')
          .insert({ 
            instance_id: instanceId, 
            organization_id: organizationId, // <--- ADICIONADO
            jid: chatJid, 
            name: displayName, 
            last_message_at: timestamp 
          })
          .select('id')
          .single();
        if (error) throw error;
        chatId = newChat.id;
      } else {
        chatId = existingChat.id;
        const updates = { 
          last_message_at: timestamp,
          organization_id: organizationId 
        };
        // SÓ atualiza o nome do chat se a mensagem NÃO vier de mim (para não sobrescrever o contato com meu nome)
        if (!fromMe && !chatJid.endsWith('@g.us') && message.pushName) {
           updates.name = message.pushName;
        }
        await supabase.from('whatsapp_chats').update(updates).eq('id', chatId);
      }

      // Salva mensagem (upsert por key_id para idempotência)
      const { error: msgErr } = await supabase.from('whatsapp_messages').upsert({
        instance_id: instanceId,
        organization_id: organizationId, // <--- ADICIONADO
        chat_id: chatId,
        key_id: message.key.id,
        message_type: messageType,
        content,
        from_me: fromMe,
        sender_name: message.pushName || null,
        status: fromMe ? 'sent' : 'received',
        timestamp,
        media_url: mediaUrl,
        mime_type: mimeType,
        metadata: message,
      }, { onConflict: 'key_id' });

      if (msgErr) console.error(`[SessionManager] ❌ Erro ao salvar mensagem:`, msgErr.message);

      // DISPARO DE AUTOMAÇÃO WHATSAPP-TO-LEAD (W2L)
      if (!fromMe && !chatJid.endsWith('@g.us')) {
        this._handleLeadAutomation(instanceId, organizationId, chatJid, message, content, supabase).catch(e => {
          console.error('[SessionManager] ❌ Erro na automação W2L:', e.message);
        });
      }
    } catch (e) {
      console.error(`[SessionManager] ❌ Falha crítica em _saveMessage:`, e.message);
    }
  }

  /**
   * Automação de Leads: Transforma novos contatos em oportunidades no Pipeline
   */
  async _handleLeadAutomation(instanceId, organizationId, chatJid, message, content, supabase) {
    const phone = chatJid.split('@')[0];
    
    // 1. Verifica se já existe um lead com este telefone
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('phone', phone)
      .maybeSingle();

    if (existingLead) return; 

    console.log(`[W2L] 🤖 Nova oportunidade detectada! Processando lead para: ${phone}`);

    // 2. Inteligência Artificial: Resumo e Classificação
    let summary = 'Novo contato via WhatsApp';
    let classification = 'Lead Frio';
    
    try {
      const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      if (apiKey && content && content.length > 5) {
        // Importação dinâmica para compatibilidade
        const { openaiService } = await import('../../services/openaiService.js').then(m => m.default || m).catch(() => ({}));
        
        const prompt = `Analise esta mensagem de um interessado em imóveis e retorne APENAS um JSON (sem markdown) com os campos "resumo" (curto) e "classificacao" (Alta Prioridade, Interessado ou Curioso). Mensagem: "${content}"`;
        
        if (openaiService?.generateText) {
          const aiResponse = await openaiService.generateText(prompt, apiKey);
          try {
            const aiData = JSON.parse(aiResponse.replace(/```json|```/g, ''));
            summary = aiData.resumo || summary;
            classification = aiData.classificacao || classification;
          } catch (e) {
            console.warn('[W2L] IA retornou texto não-JSON, usando como resumo.');
            summary = aiResponse.substring(0, 100);
          }
        }
      }
    } catch (aiErr) {
      console.warn('[W2L] ⚠️ IA falhou:', aiErr.message);
    }

    // 3. Criação do Lead no Pipeline
    const { error: leadErr } = await supabase
      .from('leads')
      .insert({
        organization_id: organizationId,
        name: message.pushName || `Lead ${phone.substring(phone.length - 4)}`,
        phone: phone,
        source: 'WhatsApp',
        status: 'Novo',
        notes: summary,
        classification: classification,
        chat_jid: chatJid
      });

    if (leadErr) console.error('[W2L] ❌ Erro ao criar lead:', leadErr.message);
    else console.log(`[W2L] ✅ Lead criado com sucesso para ${phone} (${classification})`);
  }
}
