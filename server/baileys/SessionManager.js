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
          console.log(`[SessionManager] 📲 QR gerado para ${instanceId}`);
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
          `[SessionManager] 🔌 Conexão fechada: ${instanceId} (Code: ${statusCode}). Reconnect: ${shouldReconnect}`
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
          if (message.pushName && message.key.participant) {
            this.contactStore.set(instanceId, message.key.participant, {
              pushName: message.pushName,
            });
          } else if (message.pushName && !message.key.fromMe) {
            this.contactStore.set(instanceId, message.key.remoteJid, {
              pushName: message.pushName,
            });
          }

          await this._saveMessage(session, message);
          this.emit('message', { instanceId, message });
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
            this.contactStore.set(instanceId, jid, {
              pushName: message.pushName,
            });
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

      // Resolve número do CHAT (para whatsapp_chats)
      const chatRawNumber = contactJid.split('@')[0];
      let chatCleanNumber = chatRawNumber.replace(/\D/g, '');
      if (chatCleanNumber.length === 10 || chatCleanNumber.length === 11)
        chatCleanNumber = '55' + chatCleanNumber;
      const chatPhoneNumber = '+' + chatCleanNumber;

      // Resolve nome do REMETENTE via ContactStore (cascata inteligente)
      let senderName = null;
      let finalSenderJid = senderJid;

      // Tenta extrair o Telefone Real (PN) caso o remetente seja um LID
      if (senderJid && senderJid.includes('@lid')) {
        // O Baileys às vezes fornece o PN (Phone Number) vinculado ao LID
        const pnJid = message.metadata?.pnJid || message.pnJid;
        if (pnJid) {
          finalSenderJid = pnJid;
          // Salva esse mapeamento no ContactStore para o futuro
          this.contactStore.set(instanceId, senderJid, { verifiedName: pnJid.split('@')[0] });
        }
      }

      if (finalSenderJid) {
        senderName = this.contactStore.resolveName(instanceId, finalSenderJid, message.pushName);
      }

      // Fallback final: prioriza PushName, senão ID Bruto
      if (!senderName) {
        if (message.pushName && message.pushName !== '~') {
          senderName = message.pushName;
        } else {
          // Se não tem nome, mostra o ID original (sem + se for LID)
          const raw = finalSenderJid?.split('@')[0] || 'Desconhecido';
          senderName = raw.length >= 15 ? raw : `+${raw}`;
        }
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

      // W2L — Automação de Leads (só PV)
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // W2L — WhatsApp to Lead
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
        const { openaiService } = await import(
          '../../services/openaiService.js'
        )
          .then((m) => m.default || m)
          .catch(() => ({}));
        const prompt = `Analise esta mensagem de um interessado em imóveis e retorne APENAS um JSON (sem markdown) com os campos "resumo" (curto) e "classificacao" (Alta Prioridade, Interessado ou Curioso). Mensagem: "${content}"`;
        if (openaiService?.generateText) {
          const aiResponse = await openaiService.generateText(prompt, apiKey);
          try {
            const aiData = JSON.parse(
              aiResponse.replace(/```json|```/g, '')
            );
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
      name:
        this.contactStore.resolveName(instanceId, chatJid, message.pushName) ||
        `Lead ${phone.substring(phone.length - 4)}`,
      phone: phone,
      source: 'WhatsApp',
      status: 'Novo',
      notes: summary,
      classification: classification,
      chat_jid: chatJid,
    });
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

          // Coleta os nomes de todos os participantes do grupo
          if (metadata.participants) {
            for (const p of metadata.participants) {
              if (p.id) {
                this.contactStore.set(instanceId, p.id, {
                  pushName: p.name || p.notify || null,
                  verifiedName: p.verifiedName || null,
                });

                contactBatch.push({
                  instance_id: instanceId,
                  jid: p.id,
                  push_name: p.name || p.notify || null,
                  verified_name: p.verifiedName || null,
                  notify: p.notify || null,
                  updated_at: new Date().toISOString(),
                });
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
