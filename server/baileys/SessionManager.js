/**
 * SessionManager.js — Gerenciador Completo do Ciclo de Vida do WhatsApp
 *
 * ARQUITETURA v2:
 * - ContactStore integrado (cache em memória + persistência)
 * - Coleta de contatos via contacts.upsert / contacts.update
 * - Resolução de pushName com cascata inteligente
 * - Processamento de menções via contextInfo.mentionedJid
 * - Sincronização de metadados de grupos
 * - Health check antes de enviar mensagem
 * - Backoff exponencial para reconexão
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
import { ContactStore } from './ContactStore.js';
import { AIAutomationEngine } from '../lib/AIAutomation.js';

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
    this.contactStore = new ContactStore();
    this.automationEngine = new AIAutomationEngine(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);
  }

  async boot() {
    console.log('[SessionManager] 🚀 Iniciando boot...');
    const supabase = await this.persistence.getSupabaseClient();

    // Reseta instâncias presas
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

        // Carrega contatos do DB para o cache antes de conectar
        await this.contactStore.loadFromDB(instance.id, supabase);

        const session = await this.startSession(
          instance.id,
          instance.organization_id
        );

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
      keepAliveIntervalMs: 60000,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: true,
    }).catch(err => {
      console.error(`[SessionManager] 🧨 Erro fatal ao criar WASocket para ${instanceId}:`, err);
      throw err;
    });


    session.sock = sock;

    // ──────────────────────────────────────────
    // EVENTO: Credenciais
    // ──────────────────────────────────────────
    sock.ev.on('creds.update', async () => {
      await saveCreds();
      this.persistence.scheduleDBSync(instanceId);
    });

    // ──────────────────────────────────────────
    // EVENTO: Conexão
    // ──────────────────────────────────────────
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrImage = await qrcode.toDataURL(qr);
          await this.persistence.saveQRCode(instanceId, qrImage);
          this.emit('qr', { instanceId, qrImage });
          console.log(`[SessionManager] 📲 QR Code gerado para ${instanceId}`);
          // Fallback: se 'qr_pending' falhar no banco (pela constraint), a conexão ainda continua.
          await this.persistence.updateStatus(instanceId, 'qr_pending', { qr_code: qrImage })
            .catch(e => console.error(`[SessionManager] ⚠️ Falha ao salvar status qr_pending (verificar migrations):`, e.message));
        } catch (e) {
          console.error('[SessionManager] Falha no QR:', e.message);
        }
      }

      if (connection === 'open') {
        session.status = 'conectado';
        session.reconnectAttempts = 0;
        const phoneNumber = sock?.user?.id?.split(':')[0]?.split('@')[0] || '';
        await this.persistence.updateStatus(instanceId, 'connected', {
          phone_number: phoneNumber,
        });
        this.emit('connected', { instanceId, phoneNumber });
        console.log(`[SessionManager] ✅ ${instanceId} CONECTADO!`);

        // Sincroniza metadados dos grupos + contatos dos participantes em background
        this._syncAllGroups(session).catch((e) =>
          console.warn('[SessionManager] Erro sync grupos:', e.message)
        );
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect =
          statusCode !== DisconnectReason?.loggedOut &&
          statusCode !== DisconnectReason?.badSession;

        session.status = shouldReconnect ? 'reconectando' : 'desconectado';

        await this.persistence.updateStatus(
          instanceId,
          shouldReconnect ? 'reconnecting' : 'disconnected',
          { qr_code: null }
        );
        this.emit('disconnected', { instanceId, statusCode });

        console.log(
          `[SessionManager] 🔌 Conexão fechada: ${instanceId} (Code: ${statusCode}). Reconnect: ${shouldReconnect}`,
          lastDisconnect?.error || ''
        );


        if (!session.reconnectAttempts) session.reconnectAttempts = 0;

        const delay =
          RECONNECT_DELAYS[
            Math.min(session.reconnectAttempts, RECONNECT_DELAYS.length - 1)
          ] || 5000;

        if (shouldReconnect && !session.isShuttingDown) {
          if (session.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.log(
              `[SessionManager] ❌ Max tentativas (${MAX_RECONNECT_ATTEMPTS}) para ${instanceId}. Limpando.`
            );
            await this.persistence.clearSession(instanceId);
            this.sessions.delete(instanceId);
            this.contactStore.clear(instanceId);
            session.reconnectAttempts = 0;
            return;
          }

          console.log(
            `[SessionManager] ⏳ Tentativa ${session.reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS} em ${delay}ms`
          );
          session.reconnectAttempts++;

          setTimeout(async () => {
            if (
              this.sessions.get(instanceId) === session &&
              !session.isShuttingDown
            ) {
              try {
                await this.startSession(instanceId, organizationId);
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
          await this.persistence.clearSession(instanceId);
          this.sessions.delete(instanceId);
          this.contactStore.clear(instanceId);
        }
      }
    });

    // ──────────────────────────────────────────
    // EVENTO: Contatos (NOVO — CR#1)
    // ──────────────────────────────────────────
    sock.ev.on('contacts.upsert', async (contacts) => {
      console.log(
        `[SessionManager] 📇 contacts.upsert: ${contacts.length} contatos recebidos para ${instanceId}`
      );
      const batch = this.contactStore.processBatch(instanceId, contacts);
      if (batch.length > 0) {
        const supabase = await this.persistence.getSupabaseClient();
        await this.contactStore.persistToDB(instanceId, batch, supabase);
      }
    });

    sock.ev.on('contacts.update', async (updates) => {
      console.log(
        `[SessionManager] 📇 contacts.update: ${updates.length} atualizações para ${instanceId}`
      );
      const batch = this.contactStore.processBatch(instanceId, updates);
      if (batch.length > 0) {
        const supabase = await this.persistence.getSupabaseClient();
        await this.contactStore.persistToDB(instanceId, batch, supabase);
      }
    });

    // ──────────────────────────────────────────
    // EVENTO: Mensagens em Tempo Real
    // ──────────────────────────────────────────
    sock.ev.on('messages.upsert', async (m) => {
      for (const message of m.messages) {
        if (message?.key?.remoteJid) {
          // Coleta pushName do remetente para o ContactStore
          let targetJid = null;
          if (message.pushName && message.key.participant) targetJid = message.key.participant;
          else if (message.pushName && !message.key.fromMe) targetJid = message.key.remoteJid;

          if (targetJid && message.pushName) {
            const { merged, hasNewName } = this.contactStore.set(instanceId, targetJid, {
              pushName: message.pushName,
            });
            // Se o nome é novo/mudou, persiste no banco imediatamente para não perder no reboot
            if (hasNewName) {
              const supabase = await this.persistence.getSupabaseClient();
              this.contactStore.persistToDB(instanceId, [{ instance_id: instanceId, ...merged }], supabase).catch(() => {});
            }
          }

          await this._saveMessage(session, message);
          this.emit('message', { instanceId, message });

          // Auto-cura: Se for grupo e não tivermos o nome do remetente resolvido, força um pequeno sync
          if (message.key.remoteJid.endsWith('@g.us') && !message.fromMe && message.pushName === undefined) {
             this._syncSingleGroup(session, message.key.remoteJid).catch(() => {});
          }
        }
      }
    });

    // ──────────────────────────────────────────
    // EVENTO: Histórico de Mensagens
    // ──────────────────────────────────────────
    sock.ev.on('messaging-history.set', async ({ messages }) => {
      for (const message of messages) {
        if (message?.key?.remoteJid) {
          // Coleta pushName do histórico se disponível
          if (message.pushName) {
            const jid = message.key.participant || message.key.remoteJid;
            const { merged, hasNewName } = this.contactStore.set(instanceId, jid, {
              pushName: message.pushName,
            });
            if (hasNewName) {
              const supabase = await this.persistence.getSupabaseClient();
              this.contactStore.persistToDB(instanceId, [{ instance_id: instanceId, ...merged }], supabase).catch(() => {});
            }
          }
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
    this.contactStore.clear(instanceId);
    await this.persistence.clearSession(instanceId);
  }

  async sendMessage(instanceId, jid, text) {
    console.log(
      `[WhatsApp] 📤 Enviando mensagem para ${jid} via ${instanceId}`
    );

    let session = this.sessions.get(instanceId);

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

    if (session.sock.ws?.readyState !== 1) {
      console.log(
        `[WhatsApp] ⚠️ Socket não pronto (state: ${session.sock.ws?.readyState}). Reconectando...`
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

  getAllSessionStates() {
    const res = {};
    for (const [id, session] of this.sessions.entries()) {
      const contactStats = this.contactStore.getStats(id);
      res[id] = {
        alive: session.status === 'conectado',
        state: session.status,
        contacts: contactStats,
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // _saveMessage — Processamento e Persistência de Mensagens
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

      const isGroup = contactJid.endsWith('@g.us');
      const fromMe = message.key?.fromMe ?? false;

      // ── Identificação do Remetente ──────────────────────────────
      // Em grupos: key.participant é o JID do remetente
      // Em PV: remoteJid é o JID do remetente
      const senderJid = isGroup
        ? message.key?.participant || message.participant || null
        : fromMe
          ? instanceJid
          : contactJid;

      // Resolve número do CHAT (para whatsapp_chats) com normalização brasileira
      const chatPhoneNumber = this.contactStore.formatNumber(contactJid, 'clean');

      // Resolve nome do REMETENTE via ContactStore (cascata inteligente)
      let senderName = null;
      let finalSenderJid = senderJid;

      // 1. Tenta extrair Telefone Real (PN) do LID
      if (senderJid && senderJid.includes('@lid')) {
        const pnJid = message.metadata?.pnJid || message.pnJid;
        if (pnJid) {
          finalSenderJid = pnJid;
          this.contactStore.set(instanceId, senderJid, { verifiedName: pnJid.split('@')[0] });
        }
      }

      // 2. Busca no ContactStore
      if (finalSenderJid) {
        senderName = this.contactStore.resolveName(instanceId, finalSenderJid, message.pushName);
      }

      // 3. AGRESSIVO: Se ainda é número/LID, busca na memória do socket do Baileys
      if (!senderName || /^\d+$/.test(senderName) || senderName.length >= 15) {
        const sockContact = session.sock?.contacts?.[finalSenderJid] || session.sock?.contacts?.[senderJid];
        if (sockContact) {
          senderName = sockContact.name || sockContact.notify || sockContact.verifiedName || null;
          if (senderName) {
            // Atualiza o store com o que achamos na memória do socket
            this.contactStore.set(instanceId, finalSenderJid, { pushName: senderName });
          }
        }
      }

      // 4. Fallback: Requisição direta ao WhatsApp caso não tenhamos nome
      if (!senderName) {
        if (message.pushName && message.pushName !== '~') {
          senderName = message.pushName;
        } else if (session.sock && finalSenderJid) {
            try {
                // Última tentativa: força o Baileys a buscar o perfil ativo do usuário agora
                const directContact = await session.sock.getContact(finalSenderJid).catch(() => null);
                if (directContact && (directContact.name || directContact.notify)) {
                    senderName = directContact.name || directContact.notify;
                    this.contactStore.set(instanceId, finalSenderJid, { pushName: senderName });
                }
            } catch (e) {
                // Ignore
            }
        }
      }

      // 5. AGRESSIVO+: Se ainda é número/LID e é um grupo, busca nos participantes do grupo
      if (isGroup && (!senderName || /^\d+$/.test(senderName) || senderName.length >= 15)) {
        try {
          const metadata = await session.sock.groupMetadata(contactJid).catch(() => null);
          if (metadata && metadata.participants) {
            const participant = metadata.participants.find(p => p.id === senderJid || p.lid === senderJid);
            if (participant && (participant.name || participant.notify)) {
              senderName = participant.name || participant.notify;
              // Salva para o futuro
              this.contactStore.set(instanceId, senderJid, { 
                pushName: senderName,
                linkedJid: participant.lid || participant.id 
              });
              const batch = this.contactStore.processBatch(instanceId, [{
                id: senderJid,
                name: senderName,
                notify: participant.notify,
                lid: participant.lid
              }]);
              this.contactStore.persistToDB(instanceId, batch, supabase).catch(() => {});
            }
          }
        } catch (e) {
          // Ignore
        }
      }

      // 6. Fallback Final Irrecuperável: Formatação Brasileira Padrão
      if (!senderName) {
           senderName = this.contactStore.formatNumber(finalSenderJid || senderJid, 'display');
      }

      // ── Extração de Menções (contextInfo) ──────────────────────
      const contextInfo =
        message.message?.extendedTextMessage?.contextInfo ||
        message.message?.imageMessage?.contextInfo ||
        message.message?.videoMessage?.contextInfo ||
        null;

      const mentionedJids = contextInfo?.mentionedJid || [];

      const supabase = await this.persistence.getSupabaseClient();
      const messageType = Object.keys(message.message || {})[0] || 'unknown';

      // ── Extração de Conteúdo ───────────────────────────────────
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
        ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(messageType)
      ) {
        const labels = {
          imageMessage: '(Imagem)',
          videoMessage: '(Vídeo)',
          audioMessage: '(Áudio)',
          documentMessage: '(Arquivo)',
        };
        content = labels[messageType] || '(Mídia)';
      }

      // ── Download de Mídia ──────────────────────────────────────
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

      // ── Processamento de Automação IA (Texto & Áudio) ───────────
      let audioBuffer = null;
      if (messageType === 'audioMessage' && session?.sock) {
        try {
          const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
          audioBuffer = await downloadMediaMessage(message, 'buffer', {});
        } catch (e) {}
      }

      if (!fromMe && !isGroup) {
        this._handleAIAutomation(
          organizationId,
          contactJid.split('@')[0],
          {
            content: content !== '(Áudio)' ? content : null,
            audioData: audioBuffer,
            mimeType: msg[messageType]?.mimetype
          }
        ).catch(e => console.warn('[AIAutomation] Shadow Error:', e.message));
      }

      // ── Resolução do Nome do Grupo ─────────────────────────────
      let groupName = null;
      if (isGroup && session?.sock) {
        try {
          const metadata = await session.sock
            .groupMetadata(contactJid)
            .catch(() => null);
          if (metadata?.subject) groupName = metadata.subject;
        } catch (e) {
          console.warn(
            `[SessionManager] Falha metadata grupo ${contactJid}`
          );
        }
      }

      // ── Upsert do Chat ─────────────────────────────────────────
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
        // Nome do chat: grupo usa subject, PV usa pushName ou número
        const chatDisplayName = isGroup
          ? groupName || contactJid.split('@')[0]
          : message.pushName && message.pushName !== '~'
            ? message.pushName
            : chatPhoneNumber;

        const { data: newChat } = await supabase
          .from('whatsapp_chats')
          .insert({
            instance_id: instanceId,
            organization_id: organizationId,
            jid: contactJid,
            name: chatDisplayName,
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
        };
        if (profilePhotoUrl) updates.profile_photo_url = profilePhotoUrl;

        // Atualiza nome do grupo se veio
        if (isGroup && groupName && existingChat.name !== groupName) {
          updates.name = groupName;
        }
        // Atualiza nome do PV se não é grupo e tem pushName válido
        if (
          !isGroup &&
          !fromMe &&
          message.pushName &&
          message.pushName !== '~'
        ) {
          updates.name = message.pushName;
        }

        await supabase.from('whatsapp_chats').update(updates).eq('id', chatId);
      }

      if (!chatId) return;

      // ── Upsert da Mensagem (com sender_jid e mentioned_jids) ──
      await supabase.from('whatsapp_messages').upsert(
        {
          instance_id: instanceId,
          organization_id: organizationId,
          chat_id: chatId,
          key_id: message.key.id,
          message_type: messageType,
          content,
          from_me: fromMe,
          sender_name: senderName,
          sender_jid: senderJid,
          mentioned_jids: mentionedJids.length > 0 ? mentionedJids : [],
          status: fromMe ? 'sent' : 'received',
          timestamp,
          media_url: mediaUrl,
          mime_type: mimeType,
          metadata: message,
        },
        { onConflict: 'key_id' }
      );

      // W2L — Automação de Leads (só PV) - REMOVIDO EM FAVOR DA NOVA _handleAIAutomation
    } catch (e) {
      console.error(`[SessionManager] Erro _saveMessage:`, e.message);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AI — AI-Powered Automation (Kanban Machine)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  async _handleAIAutomation(organizationId, phone, messageParams) {
    try {
      const supabase = await this.persistence.getSupabaseClient();
      
      // 1. Verificar se o lead existe
      const { data: lead } = await supabase
        .from('leads')
        .select('id, name, status, notes, classification')
        .eq('organization_id', organizationId)
        .eq('phone', phone)
        .maybeSingle();

      if (!lead) {
        // Fluxo para NOVO LEAD
        console.log(`[AIAutomation] Criando novo lead para ${phone}`);
        const aiResult = await this.automationEngine.processIntent({ ...messageParams, organizationId });
        
        if (!aiResult) return;

        await supabase.from('leads').insert({
          organization_id: organizationId,
          name: aiResult.name || `Lead ${phone.substring(phone.length - 4)}`,
          phone: phone,
          source: 'WhatsApp',
          status: aiResult.suggestedStage || 'Novo',
          notes: aiResult.transcricao || aiResult.intent,
          classification: aiResult.classification || 'Interessado',
          chat_jid: `${phone}@s.whatsapp.net`,
        });
      } else {
        // Fluxo para LEAD EXISTENTE (Mover no Kanban)
        await this.automationEngine.handleLeadUpdate(organizationId, phone, messageParams);
      }
    } catch (e) {
      console.error('[AIAutomation] Erro geral:', e.message);
    }
  }

  /**
   * Sincroniza um único grupo (usado para auto-cura)
   */
  async _syncSingleGroup(session, groupJid) {
    const { sock, instanceId } = session;
    if (!sock) return;

    try {
      const metadata = await sock.groupMetadata(groupJid).catch(() => null);
      if (!metadata || !metadata.participants) return;

      const supabase = await this.persistence.getSupabaseClient();
      const contactBatch = [];

      for (const p of metadata.participants) {
        const jid = p.id;
        const lid = p.lid;
        const name = p.name || p.notify || null;

        if (jid) {
          const { merged } = this.contactStore.set(instanceId, jid, {
            pushName: name,
            verifiedName: p.verifiedName || null,
            linkedJid: lid || null
          });

          contactBatch.push({
            instance_id: instanceId,
            ...merged,
            updated_at: new Date().toISOString(),
          });

          if (lid && lid !== jid) {
            const { merged: lidMerged } = this.contactStore.set(instanceId, lid, {
              pushName: name,
              linkedJid: jid
            });
            contactBatch.push({
              instance_id: instanceId,
              ...lidMerged,
              updated_at: new Date().toISOString(),
            });
          }
        }
      }

      if (contactBatch.length > 0) {
        await this.contactStore.persistToDB(instanceId, contactBatch, supabase);
      }
    } catch (e) {
       console.warn(`[SessionManager] Falha auto-cura grupo ${groupJid}:`, e.message);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Sync de Grupos — Carrega metadados e participantes
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

      const contactBatch = [];

      for (const chat of chats) {
        if (!chat.jid.endsWith('@g.us')) continue;

        try {
          const metadata = await sock
            .groupMetadata(chat.jid)
            .catch(() => null);
          if (!metadata) continue;

          // Atualiza nome do grupo
          const updates = {};
          if (metadata.subject && chat.name !== metadata.subject)
            updates.name = metadata.subject;

          let photoUrl = null;
          try {
            photoUrl = await sock
              .profilePictureUrl(chat.jid, 'image')
              .catch(() => null);
          } catch (e) {}
          if (photoUrl) updates.profile_photo_url = photoUrl;

          if (Object.keys(updates).length > 0) {
            await supabase
              .from('whatsapp_chats')
              .update(updates)
              .eq('id', chat.id);
          }

          // Coleta os nomes e mapeamentos de LIDs de todos os participantes do grupo
          if (metadata.participants) {
            for (const p of metadata.participants) {
              const jid = p.id;
              const lid = p.lid; // Baileys fornece o LID separadamente se disponível

              if (jid) {
                const name = p.name || p.notify || null;
                
                // Salva o JID principal (PN)
                this.contactStore.set(instanceId, jid, {
                  pushName: name,
                  verifiedName: p.verifiedName || null,
                  linkedJid: lid || null
                });

                contactBatch.push({
                  instance_id: instanceId,
                  jid: jid,
                  push_name: name,
                  verified_name: p.verifiedName || null,
                  notify: p.notify || null,
                  linked_jid: lid || null,
                  updated_at: new Date().toISOString(),
                });

                // Se temos um LID, salvamos a entrada do LID apontando para o PN
                if (lid && lid !== jid) {
                  this.contactStore.set(instanceId, lid, {
                    pushName: name,
                    linkedJid: jid
                  });
                  
                   contactBatch.push({
                     instance_id: instanceId,
                     jid: lid,
                     push_name: name,
                     linked_jid: jid,
                     updated_at: new Date().toISOString(),
                   });
                }
              }
            }
          }
        } catch (e) {
          console.warn(
            `[SessionManager] Falha sync grupo ${chat.jid}:`,
            e.message
          );
        }
      }

      // Persiste contatos de todos os grupos de uma vez
      if (contactBatch.length > 0) {
        await this.contactStore.persistToDB(instanceId, contactBatch, supabase);
        console.log(
          `[SessionManager] 📇 ${contactBatch.length} contatos de grupos sincronizados`
        );
      }
    } catch (err) {
      console.error('[SessionManager] Erro no _syncAllGroups:', err.message);
    }
  }
}
