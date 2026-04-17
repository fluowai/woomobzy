import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabase = createClient(supabaseUrl, supabaseKey);

const sessionsDir = path.join(__dirname, '../../.sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

class WhatsAppManager {
  constructor() {
    this.sessions = new Map();
    this.qrCodes = new Map();
    this.callbacks = new Map();
  }

  async initSession(instanceId, organizationId) {
    // 1. Se já existe uma sessão para este ID, encerra ela primeiro para evitar conflito 440
    const existingSession = this.sessions.get(instanceId);
    if (existingSession?.sock) {
      console.log(`[WhatsApp] ♻️ Encerrando sessão anterior duplicada para: ${instanceId}`);
      try {
        existingSession.sock.ev.removeAllListeners('connection.update');
        existingSession.sock.end();
      } catch (e) {
        // Ignora erros ao fechar
      }
      this.sessions.delete(instanceId);
    }

    const sessionPath = path.join(sessionsDir, `${instanceId}`);
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    // Restaurando busca dinâmica de versão com tratamento de erro
    let version = [2, 3000, 1015901307]; // Fallback seguro
    try {
      const latest = await fetchLatestBaileysVersion();
      version = latest.version;
      console.log(`[WhatsApp] 🛠️ Usando versão v${version.join('.')}`);
    } catch (err) {
      console.log(`[WhatsApp] ⚠️ Falha ao buscar versão, usando fallback v${version.join('.')}`);
    }

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['Windows', 'Chrome', '111.0.0.0'],
      syncFullHistory: false,
      markOnline: false, 
      generateHighQualityLinkPreview: false,
      defaultQueryTimeoutMs: 120000,
      connectTimeoutMs: 120000,
      retryRequestDelayMs: 5000,
      getMessage: async (key) => {
        return { conversation: '' };
      }
    });

    sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
      } catch (e) {
        console.error('Error saving creds:', e);
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(`[WhatsApp] 📲 QR Code gerado para instância: ${instanceId}`);
        try {
          const qrImage = await qrcode.toDataURL(qr);
          this.qrCodes.set(instanceId, qrImage);
          this.emit(instanceId, 'qr', qrImage);
          
          console.log(`[WhatsApp] 💾 Salvando QR Code no banco de dados para Realtime...`);
          const { error } = await supabase
            .from('whatsapp_instances')
            .update({ qr_code: qrImage, status: 'connecting' })
            .eq('id', instanceId);
            
          if (error) console.error(`[WhatsApp] ❌ Erro ao salvar QR no DB:`, error.message);
          else console.log(`[WhatsApp] ✅ QR Code salvo com sucesso!`);
        } catch (e) {
          console.error('[WhatsApp] ❌ Erro ao processar QR:', e);
        }
      }

      if (connection === 'open') {
        const phoneNumber = sock.user?.id?.replace(':',
'').replace('@s.whatsapp.net', '') || '';
        await this.updateInstanceStatus(instanceId, 'connected', phoneNumber);
        this.emit(instanceId, 'connected', { phoneNumber });
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        // Não reconecta em 401 (Unauthorized), 405 (Logged Out) ou 440 (Conflict)
        const terminalCodes = [401, 405, 440, 440]; 
        const shouldReconnect = !terminalCodes.includes(statusCode);
        
        console.log(`🔌 Connection closed for ${instanceId}. Status: ${statusCode}. Reconnect: ${shouldReconnect}`);
        
        if (shouldReconnect) {
          await this.updateInstanceStatus(instanceId, 'reconnecting');
          this.emit(instanceId, 'reconnecting');
          
          setTimeout(() => {
            // Só tenta re-inicializar se a sessão ainda estiver no mapa e o socket atual for o que fechou
            if (this.sessions.get(instanceId)?.sock === sock) {
              console.log(`🔄 Attempting to re-initialize session for ${instanceId}...`);
              this.initSession(instanceId, organizationId);
            }
          }, 5000);
        } else {
          await this.updateInstanceStatus(instanceId, statusCode === 440 ? 'disconnected' : 'disconnected');
          if (statusCode === 440) {
             console.log(`⚠️ Conflito de sessão detectado para ${instanceId}. Outra conexão está ativa.`);
          }
          this.emit(instanceId, 'disconnected');
          this.sessions.delete(instanceId);
          
          if (statusCode === 401) {
            if (fs.existsSync(sessionPath)) {
              fs.rmSync(sessionPath, { recursive: true, force: true });
            }
          }
        }
      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      const message = m.messages[0];
      if (message) {
        await this.saveMessage(instanceId, message);
        this.emit(instanceId, 'message', message);
      }
    });

    sock.ev.on('messaging-history.set', async ({ chats, contacts, messages, isLatest }) => {
      console.log(`[WhatsApp] 📚 Recebido histórico: ${chats.length} chats, ${messages.length} mensagens.`);
      for (const message of messages) {
        await this.saveMessage(instanceId, message);
      }
    });

    this.sessions.set(instanceId, { sock, organizationId });
    console.log(`[WhatsApp] 📡 Sessão registrada localmente: ${instanceId}`);
    return sock;
  }

  async loadSessions() {
    try {
      console.log('🔄 Loading WhatsApp sessions from database...');
      const { data: instances, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .in('status', ['connected', 'connecting', 'reconnecting']);

      if (error) throw error;

      console.log(`Found ${instances?.length || 0} active instances to restore.`);

      for (const instance of instances) {
        try {
          // Check if session folder exists
          const sessionPath = path.join(sessionsDir, `${instance.id}`);
          if (fs.existsSync(sessionPath)) {
            console.log(`Restoring session for ${instance.name} (${instance.id})...`);
            await this.initSession(instance.id, instance.organization_id);
          } else {
            console.warn(`Session folder missing for ${instance.name} (${instance.id}), marking as disconnected.`);
            await this.updateInstanceStatus(instance.id, 'disconnected');
          }
        } catch (err) {
          console.error(`Failed to restore session for ${instance.id}:`, err.message);
        }
      }
    } catch (e) {
      console.error('Error loading sessions:', e);
    }
  }

  async saveSessionToDB(instanceId, sessionData) {
    try {
      await supabase
        .from('whatsapp_instances')
        .update({ session_data: sessionData })
        .eq('id', instanceId);
    } catch (e) {
      console.error('Error saving session to DB:', e);
    }
  }

  async updateInstanceStatus(instanceId, status, phoneNumber = null) {
    try {
      const update = { status };
      if (phoneNumber) update.phone_number = phoneNumber;
      if (status === 'connected') update.qr_code = null;
      
      await supabase
        .from('whatsapp_instances')
        .update(update)
        .eq('id', instanceId);
    } catch (e) {
      console.error('Error updating status:', e);
    }
  }

  async saveMessage(instanceId, message) {
    try {
      const chatJid = message.key.remoteJid;
      if (!chatJid || chatJid === 'status@broadcast') return;

      const fromMe = message.key.fromMe;
      const messageType = Object.keys(message.message || {})[0] || 'unknown';
      
      let content = '';
      const msg = message.message;
      if (msg?.conversation) content = msg.conversation;
      else if (msg?.extendedTextMessage?.text) content = msg.extendedTextMessage.text;
      else if (msg?.imageMessage?.caption) content = msg.imageMessage.caption;
      else if (msg?.videoMessage?.caption) content = msg.videoMessage.caption;
      else if (msg?.buttonsResponseMessage?.selectedButtonId) content = msg.buttonsResponseMessage.selectedButtonId;
      else if (msg?.listResponseMessage?.title) content = msg.listResponseMessage.title;

      // 1. Garantir que o chat existe
      const { data: chatData, error: chatQueryError } = await supabase
        .from('whatsapp_chats')
        .select('id')
        .eq('instance_id', instanceId)
        .eq('jid', chatJid)
        .maybeSingle();

      let chatId;

      if (!chatData) {
        const { data: newChat, error: chatError } = await supabase
          .from('whatsapp_chats')
          .insert({
            instance_id: instanceId,
            jid: chatJid,
            name: message.pushName || chatJid.replace('@s.whatsapp.net', '').replace('@g.us', ''),
            last_message_at: new Date(message.messageTimestamp * 1000).toISOString(),
          })
          .select()
          .single();
        
        if (chatError) throw chatError;
        chatId = newChat.id;
      } else {
        chatId = chatData.id;
        await supabase
          .from('whatsapp_chats')
          .update({ 
            last_message_at: new Date(message.messageTimestamp * 1000).toISOString(),
            name: message.pushName || undefined // Atualiza o nome se disponível
          })
          .eq('id', chatId);
      }

      // 2. Salvar a mensagem
      const { error: msgError } = await supabase.from('whatsapp_messages').upsert({
        instance_id: instanceId,
        chat_id: chatId,
        key_id: message.key.id,
        message_type: messageType,
        content,
        from_me: fromMe,
        status: fromMe ? 'sent' : 'received',
        timestamp: new Date(message.messageTimestamp * 1000).toISOString(),
        metadata: message,
      }, { onConflict: 'key_id' });

      if (msgError) console.error(`[WhatsApp] ❌ Erro ao salvar mensagem:`, msgError.message);
      else console.log(`[WhatsApp] ✅ Mensagem processada de: ${chatJid}`);
    } catch (e) {
      console.error('[WhatsApp] ❌ Falha crítica em saveMessage:', e.message);
    }
  }

  getSession(instanceId) {
    return this.sessions.get(instanceId);
  }

  getQRCode(instanceId) {
    return this.qrCodes.get(instanceId);
  }

  on(instanceId, event, callback) {
    const key = `${instanceId}:${event}`;
    this.callbacks.set(key, callback);
  }

  emit(instanceId, event, data) {
    const key = `${instanceId}:${event}`;
    const callback = this.callbacks.get(key);
    if (callback) callback(data);
  }

  async sendMessage(instanceId, jid, text) {
    const session = this.getSession(instanceId);
    if (!session?.sock) {
      throw new Error('Instance not connected');
    }

    try {
      const result = await session.sock.sendMessage(jid, { text });
      await this.saveMessage(instanceId, result);
      return result;
    } catch (e) {
      console.error('Error sending message:', e);
      throw e;
    }
  }

  async logout(instanceId) {
    const session = this.getSession(instanceId);
    if (session?.sock) {
      await session.sock.logout();
      await session.sock.end();
    }
    this.sessions.delete(instanceId);
    this.qrCodes.delete(instanceId);
    
    const sessionPath = path.join(sessionsDir, `${instanceId}`);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    await this.updateInstanceStatus(instanceId, 'disconnected');
  }
}

export const whatsappManager = new WhatsAppManager();
export default whatsappManager;
