/**
 * SessionManager.js — Gerenciador Simplificado do Ciclo de Vida do WhatsApp
 *
 * CORREÇÕES IMPLEMENTADAS:
 * - Health check antes de enviar mensagem
 * - Backoff exponencial para reconexão
 * - Logs detalhados
 * - Flag logout_requested para diferenciar desconexão
 */

import EventEmitter from 'events';
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import { PersistenceManager } from './PersistenceManager.js';

// Backoff exponencial para reconexões (ms)
const RECONNECT_DELAYS = [2000, 4000, 8000, 16000, 30000, 60000];
const MAX_RECONNECT_ATTEMPTS = 6;

class ManagedSession {
  constructor(instanceId, organizationId) {
    this.instanceId = instanceId;
    this.organizationId = organizationId;
    this.sock = null;
    this.status = 'desconectado';
    this.isShuttingDown = false;
    this.isLoggingOut = false;
    this.reconnectAttempts = 0;
    this.lastError = null;
  }
}

export class SessionManager extends EventEmitter {
  constructor(sessionsDir) {
    super();
    this.setMaxListeners(100);
    this.sessions = new Map();
    this.persistence = new PersistenceManager(sessionsDir);
  }

  async boot() {
    console.log('[SessionManager] 🚀 Iniciando boot (Modo Simples)...');
    const supabase = await this.persistence.getSupabaseClient();

    // Reseta instâncias presas (tudo que não for 'connected' ou 'disconnected' vira 'disconnected')
    await supabase
      .from('whatsapp_instances')
      .update({ status: 'disconnected', updated_at: new Date().toISOString() })
      .in('status', ['connecting', 'reconnecting', 'qr_pending']);

    // Traz apenas as que estavam 'connected' para reconectar no boot
    const { data: instances } = await supabase
      .from('whatsapp_instances')
      .select('id, name, organization_id')
      .eq('status', 'connected');

    console.log(
      `[SessionManager] ℹ️ ${instances?.length || 0} instâncias para reconectar`
    );

    for (const instance of instances || []) {
      try {
        console.log(`[SessionManager] 🔄 Reconectando ${instance.id}...`);
        const session = await this.startSession(
          instance.id,
          instance.organization_id
        );

        // Health check: testa se socket está realmente conectado
        if (session?.sock?.ws?.readyState === 1) {
          console.log(
            `[SessionManager] ✅ ${instance.id} reconectado com sucesso`
          );
        } else {
          console.log(
            `[SessionManager] ⚠️ ${instance.id} reconectado mas socket não está pronto`
          );
        }
      } catch (err) {
        console.error(
          `[SessionManager] ❌ Erro no boot de ${instance.id}:`,
          err.message
        );
      }
    }
    console.log('[SessionManager] ✅ Boot completo.');
  }

  async startSession(instanceId, organizationId) {
    let session = this.sessions.get(instanceId);

    if (session) {
      if (['conectando', 'conectado'].includes(session.status)) {
        console.log(
          `[SessionManager] Instância ${instanceId} já está ${session.status}. Ignorando start.`
        );
        return session;
      }
    } else {
      session = new ManagedSession(instanceId, organizationId);
      this.sessions.set(instanceId, session);
    }

    await this._connect(session);
    return session;
  }

  async _connect(session) {
    const { instanceId, organizationId } = session;

    if (session.isShuttingDown) return;

    session.status = 'conectando';
    await this.persistence.updateStatus(instanceId, 'connecting');

    const sessionPath = this.persistence.getSessionPath(instanceId);
    await this.persistence.ensureSessionReady(instanceId);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 2413, 1],
    }));

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['IMOBZY 360', 'Chrome', '1.0.0'],
      keepAliveIntervalMs: 60000, // Previne queda por inatividade NAT
      generateHighQualityLinkPreview: true,
      syncFullHistory: false, // Evita sobrecarga inicial
      markOnlineOnConnect: true,
    });

    session.sock = sock;

    sock.ev.on('creds.update', async () => {
      await saveCreds();
      this.persistence.scheduleDBSync(instanceId);
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrImage = await qrcode.toDataURL(qr);
          await this.persistence.saveQRCode(instanceId, qrImage);
          this.emit('qr', { instanceId, qrImage });
          console.log(`[SessionManager] 📲 QR gerado para ${instanceId}`);
        } catch (e) {
          console.error('[SessionManager] Falha no QR:', e.message);
        }
      }

      if (connection === 'open') {
        session.status = 'conectado';
        const phoneNumber = sock?.user?.id?.split(':')[0]?.split('@')[0] || '';
        await this.persistence.updateStatus(instanceId, 'connected', {
          phone_number: phoneNumber,
        });
        this.emit('connected', { instanceId, phoneNumber });
        console.log(`[SessionManager] ✅ ${instanceId} CONECTADO!`);
        
        // Sincroniza metadados dos grupos em background
        this._syncAllGroups(session).catch(e => console.warn('[SessionManager] Erro sync grupos:', e.message));
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect =
          statusCode !== DisconnectReason?.loggedOut &&
          statusCode !== DisconnectReason?.badSession;

        session.status = shouldReconnect ? 'reconectando' : 'desconectado';
        
        await this.persistence.updateStatus(instanceId, shouldReconnect ? 'reconnecting' : 'disconnected', {
          qr_code: null,
        });
        this.emit('disconnected', { instanceId, statusCode });

        console.log(
          `[SessionManager] 🔌 Conexão fechada: ${instanceId} (Code: ${statusCode}). shouldReconnect: ${shouldReconnect}, isShuttingDown: ${session.isShuttingDown}`
        );

        // Contador de tentativas de reconexão
        if (!session.reconnectAttempts) session.reconnectAttempts = 0;

        // Backoff exponencial: 2s, 4s, 8s, 16s, 30s, 60s
        const delays = [2000, 4000, 8000, 16000, 30000, 60000];
        const delay =
          delays[Math.min(session.reconnectAttempts, delays.length - 1)] ||
          5000;

        if (shouldReconnect && !session.isShuttingDown) {
          // Limita tentativas de reconexão
          if (session.reconnectAttempts >= 6) {
            console.log(
              `[SessionManager] ❌ Max tentativas (6) atingidas para ${instanceId}. Limpando sessão.`
            );
            await this.persistence.clearSession(instanceId);
            this.sessions.delete(instanceId);
            session.reconnectAttempts = 0;
            return;
          }

          console.log(
            `[SessionManager] ⏳ Tentativa ${session.reconnectAttempts + 1}/6 em ${delay}ms para ${instanceId}`
          );
          session.reconnectAttempts++;

          setTimeout(async () => {
            if (
              this.sessions.get(instanceId) === session &&
              !session.isShuttingDown
            ) {
              try {
                await this.startSession(instanceId, organizationId);
                session.reconnectAttempts = 0; // Reset após sucesso
                console.log(
                  `[SessionManager] ✅ Reconexão bem-sucedida para ${instanceId}`
                );
              } catch (err) {
                console.error(
                  `[SessionManager] ❌ Falha na reconexão:`,
                  err.message
                );
              }
            }
          }, delay);
        } else if (!shouldReconnect) {
          // Clear session entirely
          await this.persistence.clearSession(instanceId);
          this.sessions.delete(instanceId);
        }
      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      for (const message of m.messages) {
        if (message?.key?.remoteJid) {
          await this._saveMessage(session, message);
          this.emit('message', { instanceId, message });
        }
      }
    });

    sock.ev.on('messaging-history.set', async ({ messages }) => {
      for (const message of messages) {
        if (message?.key?.remoteJid) {
          await this._saveMessage(session, message);
        }
      }
    });
  }

  async logout(instanceId) {
    const session = this.sessions.get(instanceId);
    if (session) {
      session.isShuttingDown = true;
      try {
        await session.sock?.logout();
      } catch (e) {}
      session.sock = null;
      this.sessions.delete(instanceId);
    }
    await this.persistence.clearSession(instanceId);
  }

  async sendMessage(instanceId, jid, text) {
    console.log(
      `[WhatsApp] 📤 Enviando mensagem para ${jid} via ${instanceId}`
    );

    let session = this.sessions.get(instanceId);

    // CORREÇÃO 1: Health check - tenta reconectar se socket não existir
    if (!session || !session.sock) {
      console.log(
        `[WhatsApp] ℹ️ Socket não encontrado para ${instanceId}. Tentando reconectar...`
      );
      try {
        session = await this.startSession(instanceId, session?.organizationId);
        if (!session?.sock) {
          throw new Error('Falha ao criar socket após reconexão');
        }
      } catch (err) {
        console.error(
          `[WhatsApp] ❌ Falha ao reconectar ${instanceId}:`,
          err.message
        );
        throw new Error(`Instância offline: ${err.message}`);
      }
    }

    // Verifica se socket está pronto (readyState 1 = OPEN)
    if (session.sock.ws?.readyState !== 1) {
      console.log(
        `[WhatsApp] ⚠️ Socket não está pronto (state: ${session.sock.ws?.readyState}). Tentando reconectar...`
      );
      try {
        session = await this.startSession(instanceId, session.organizationId);
      } catch (err) {
        throw new Error(`Socket desconectado: ${err.message}`);
      }
    }

    try {
      const result = await session.sock.sendMessage(jid, { text });
      await this._saveMessage(session, result);
      console.log(`[WhatsApp] ✅ Mensagem enviada com sucesso para ${jid}`);
      return result;
    } catch (err) {
      console.error(`[WhatsApp] ❌ Erro ao enviar mensagem:`, err.message);
      throw err;
    }
  }

  getSession(instanceId) {
    return this.sessions.get(instanceId) || null;
  }

  // Permite compatibilidade com scripts antigos
  getAllSessionStates() {
    const res = {};
    for (const [id, session] of this.sessions.entries()) {
      res[id] = {
        alive: session.status === 'conectado',
        state: session.status,
      };
    }
    return res;
  }
  isSessionAlive(instanceId) {
    return this.sessions.get(instanceId)?.status === 'conectado';
  }
  getSessionState(instanceId) {
    return this.sessions.get(instanceId)?.status || 'desconectado';
  }

  // Lógica de Persistência e Processamento das Mensagens (Upsert e File Storage) e W2L (WhatsApp to Lead)
  async _saveMessage(session, message) {
    try {
      const { instanceId, organizationId } = session;
      const contactJid = message.key?.remoteJid;
      if (
        !contactJid ||
        contactJid === 'status@broadcast' ||
        contactJid.includes('@newsletter')
      )
        return;

      const instanceJid =
        session.sock?.user?.id?.split(':')[0] + '@s.whatsapp.net';
      if (contactJid === instanceJid) return;

      const rawNumber = contactJid.split('@')[0];
      // Normalização: remove caracteres não numéricos e garante o prefixo 55 se tiver 10 ou 11 dígitos
      let cleanNumber = rawNumber.replace(/\D/g, '');
      if (cleanNumber.length === 10 || cleanNumber.length === 11) cleanNumber = '55' + cleanNumber;
      const phoneNumber = '+' + cleanNumber;

      const supabase = await this.persistence.getSupabaseClient();
      const fromMe = message.key?.fromMe ?? false;
      const messageType = Object.keys(message.message || {})[0] || 'unknown';

      let content = '';
      const msg = message.message;
      if (msg?.conversation) content = msg.conversation;
      else if (msg?.extendedTextMessage?.text)
        content = msg.extendedTextMessage.text;
      else if (msg?.imageMessage?.caption) content = msg.imageMessage.caption;
      else if (msg?.videoMessage?.caption) content = msg.videoMessage.caption;
      else if (msg?.buttonsResponseMessage?.selectedButtonId)
        content = msg.buttonsResponseMessage.selectedButtonId;
      else if (msg?.listResponseMessage?.title)
        content = msg.listResponseMessage.title;
      else if (msg?.documentMessage?.caption)
        content = msg.documentMessage.caption;

      if (
        !content &&
        [
          'imageMessage',
          'videoMessage',
          'audioMessage',
          'documentMessage',
        ].includes(messageType)
      ) {
        const labels = {
          imageMessage: '(Imagem)',
          videoMessage: '(Vídeo)',
          audioMessage: '(Áudio)',
          documentMessage: '(Arquivo)',
        };
        content = labels[messageType] || '(Mídia)';
      }

      let mediaUrl = null;
      let mimeType = null;
      const mediaType = messageType.replace('Message', '');
      const isMedia = ['image', 'video', 'audio', 'document'].includes(
        mediaType
      );

      if (isMedia && session?.sock) {
        try {
          const { downloadMediaMessage } =
            await import('@whiskeysockets/baileys');
          const buffer = await downloadMediaMessage(message, 'buffer', {});
          if (buffer) {
            const ext =
              { image: 'jpg', video: 'mp4', audio: 'ogg', document: 'pdf' }[
                mediaType
              ] || 'bin';
            const path = `messages/${instanceId}/${message.key.id}.${ext}`;
            const { error: udErr } = await supabase.storage
              .from('imobzymsg')
              .upload(path, buffer, {
                contentType:
                  msg[messageType]?.mimetype || 'application/octet-stream',
                upsert: true,
              });
            if (!udErr) {
              const {
                data: { publicUrl },
              } = supabase.storage.from('imobzymsg').getPublicUrl(path);
              mediaUrl = publicUrl;
              mimeType = msg[messageType]?.mimetype;
            }
          }
        } catch (e) {
          console.warn('[SessionManager] Erro mídia:', e.message);
        }
      }

      let groupName = null;
      const isGroup = contactJid.endsWith('@g.us');

      // Resolve Group Subject if needed (only for groups)
      if (isGroup && session?.sock) {
        try {
          // Tenta pegar do cache do sock ou faz query se necessário
          const metadata = await session.sock.groupMetadata(contactJid).catch(() => null);
          if (metadata?.subject) groupName = metadata.subject;
        } catch (e) {
          console.warn(`[SessionManager] Falha ao obter metadata do grupo ${contactJid}`);
        }
      }

      let allowNameUpdate = !fromMe;
      if (isGroup) allowNameUpdate = false;

      const { data: existingChat } = await supabase
        .from('whatsapp_chats')
        .select('id, name, profile_photo_url')
        .eq('instance_id', instanceId)
        .eq('jid', contactJid)
        .maybeSingle();

      let profilePhotoUrl = existingChat?.profile_photo_url || null;
      if (!profilePhotoUrl && session?.sock) {
        try {
          profilePhotoUrl = await session.sock
            .profilePictureUrl(contactJid, 'image')
            .catch(() => null);
        } catch (e) {}
      }

      let chatId;
      const timestamp = new Date(
        (Number(message.messageTimestamp) || Date.now() / 1000) * 1000
      ).toISOString();

      if (!existingChat) {
        // Para grupos, prioriza o nome real do grupo (Group Subject). 
        // Para PV, usa pushName ou número formatado.
        const initialName = isGroup 
          ? (groupName || phoneNumber)
          : (message.pushName && message.pushName !== '~' ? message.pushName : phoneNumber);

        const { data: newChat } = await supabase
          .from('whatsapp_chats')
          .insert({
            instance_id: instanceId,
            organization_id: organizationId,
            jid: contactJid,
            name: initialName,
            last_message_at: timestamp,
            profile_photo_url: profilePhotoUrl,
          })
          .select('id')
          .single();
        chatId = newChat?.id;
      } else {
        chatId = existingChat.id;
        const updates = {
          last_message_at: timestamp,
          organization_id: organizationId,
          profile_photo_url: profilePhotoUrl,
        };

        // Se for grupo e não tínhamos o nome, atualiza agora
        if (isGroup && !existingChat.name && groupName) {
          updates.name = groupName;
        } else if (!isGroup && allowNameUpdate && message.pushName && message.pushName !== '~') {
          updates.name = message.pushName;
        }

        await supabase.from('whatsapp_chats').update(updates).eq('id', chatId);
      }

      if (!chatId) return;

      await supabase.from('whatsapp_messages').upsert(
        {
          instance_id: instanceId,
          organization_id: organizationId,
          chat_id: chatId,
          key_id: message.key.id,
          message_type: messageType,
          content,
          from_me: fromMe,
          sender_name:
            message.pushName && message.pushName !== '~'
              ? message.pushName
              : (message.key.participant || message.participant
                ? '+' + (message.key.participant || message.participant).split('@')[0].replace(/\D/g, '')
                : cleanNumber),
          status: fromMe ? 'sent' : 'received',
          timestamp,
          media_url: mediaUrl,
          mime_type: mimeType,
          metadata: message,
        },
        { onConflict: 'key_id' }
      );

      // W2L
      if (!fromMe && !isGroup) {
        this._handleLeadAutomation(
          instanceId,
          organizationId,
          contactJid,
          message,
          content,
          supabase
        ).catch(() => {});
      }
    } catch (e) {
      console.error(`[SessionManager] Erro _saveMessage:`, e.message);
    }
  }

  async _handleLeadAutomation(
    instanceId,
    organizationId,
    chatJid,
    message,
    content,
    supabase
  ) {
    const phone = chatJid.split('@')[0];
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('phone', phone)
      .maybeSingle();
    if (existingLead) return;

    let summary = 'Novo contato via WhatsApp';
    let classification = 'Lead Frio';
    try {
      const apiKey =
        process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      if (apiKey && content && content.length > 5) {
        const { openaiService } =
          await import('../../services/openaiService.js')
            .then((m) => m.default || m)
            .catch(() => ({}));
        const prompt = `Analise esta mensagem de um interessado em imóveis e retorne APENAS um JSON (sem markdown) com os campos "resumo" (curto) e "classificacao" (Alta Prioridade, Interessado ou Curioso). Mensagem: "${content}"`;
        if (openaiService?.generateText) {
          const aiResponse = await openaiService.generateText(prompt, apiKey);
          try {
            const aiData = JSON.parse(aiResponse.replace(/```json|```/g, ''));
            summary = aiData.resumo || summary;
            classification = aiData.classificacao || classification;
          } catch (e) {
            summary = aiResponse.substring(0, 100);
          }
        }
      }
    } catch (e) {}

    await supabase.from('leads').insert({
      organization_id: organizationId,
      name: message.pushName || `Lead ${phone.substring(phone.length - 4)}`,
      phone: phone,
      source: 'WhatsApp',
      status: 'Novo',
      notes: summary,
      classification: classification,
      chat_jid: chatJid,
    });
  }
  async _syncAllGroups(session) {
    const { sock, instanceId } = session;
    if (!sock) return;

    try {
      const supabase = await this.persistence.getSupabaseClient();
      const { data: chats } = await supabase
        .from('whatsapp_chats')
        .select('id, jid, name')
        .eq('instance_id', instanceId);

      if (!chats) return;

      for (const chat of chats) {
        if (chat.jid.endsWith('@g.us')) {
          try {
            const metadata = await sock.groupMetadata(chat.jid).catch(() => null);
            let photoUrl = null;
            try {
              photoUrl = await sock.profilePictureUrl(chat.jid, 'image').catch(() => null);
            } catch (e) {}

            const updates = {};
            if (metadata?.subject && chat.name !== metadata.subject)
              updates.name = metadata.subject;
            if (photoUrl) updates.profile_photo_url = photoUrl;

            if (Object.keys(updates).length > 0) {
              await supabase
                .from('whatsapp_chats')
                .update(updates)
                .eq('id', chat.id);
            }
          } catch (e) {
            console.warn(
              `[SessionManager] Falha ao sincronizar grupo ${chat.jid}:`,
              e.message
            );
          }
        }
      }
    } catch (err) {
      console.error('[SessionManager] Erro no _syncAllGroups:', err);
    }
  }
}
