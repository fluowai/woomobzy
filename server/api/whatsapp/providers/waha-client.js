import { randomUUID } from 'crypto';

export class WahaClient {
  constructor(config) {
    this.baseUrl = config.wahaUrl || config.arraphaUrl;
    this.apiKey = config.apiKey;
    this.webhookUrl = config.webhookUrl;
    this.engine = config.engine || 'noweb';
  }

  async request(path, init = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(init.headers || {});
    if (!headers.has('Content-Type') && init.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }
    if (this.apiKey) {
      headers.set('X-Api-Key', this.apiKey);
      headers.set('Authorization', `Bearer ${this.apiKey}`);
    }

    const response = await fetch(url, {
      method: init.method || 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(init.timeoutMs || 5000),
    });

    const contentType = response.headers.get('content-type') || '';
    const data = init.rawText
      ? await response.text()
      : contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => null);

    return { ok: response.ok, status: response.status, url, data };
  }

  async health() {
    const result = await this.request('/api/server/status', {
      method: 'GET',
    }).catch(() => null);
    if (result?.ok) return result;
    const fallback = await this.request('/api/health', { method: 'GET' }).catch(
      () => null
    );
    if (fallback?.ok) return fallback;
    return { ok: false, status: 503, url: this.baseUrl, data: null };
  }

  async ensureSession(instance) {
    const name = this.sessionName(instance);
    const existing = await this.getSessionByName(name);
    if (existing?.status && existing.status !== 'STOPPED') return { name };

    const body = {
      name,
      start: true,
      config: this.buildSessionConfig(instance),
    };

    const result = await this.request('/api/sessions', {
      method: 'POST',
      body,
    });
    if (!result.ok && result.status === 409) return { name };
    if (!result.ok)
      throw new Error(
        `WAHA session create failed: ${result.status} ${result.data?.error || ''}`
      );
    return { name };
  }

  async getSessionByName(name) {
    const result = await this.request(
      `/api/sessions/${encodeURIComponent(name)}`,
      { method: 'GET' }
    ).catch(() => null);
    if (!result?.ok) return null;
    return result.data;
  }

  async getQRCode(instance) {
    const name = this.sessionName(instance);
    const result = await this.request(
      `/api/${encodeURIComponent(name)}/auth/qr?format=raw`,
      { method: 'GET', rawText: true }
    ).catch(() => null);
    if (!result?.ok) return '';
    return typeof result.data === 'string' ? result.data : '';
  }

  async requestPairingCode(instance, phone) {
    const name = this.sessionName(instance);
    const body = { phone };
    const result = await this.request(
      `/api/${encodeURIComponent(name)}/auth/request-code`,
      { method: 'POST', body, timeoutMs: 10000 }
    ).catch(() => null);

    if (!result?.ok)
      throw new Error(`WAHA pairing code failed: ${result?.status || 503}`);
    return result.data;
  }

  async logout(instance) {
    const name = this.sessionName(instance);
    await this.request(`/api/sessions/${encodeURIComponent(name)}/logout`, {
      method: 'POST',
    }).catch(() => null);
  }

  async deleteSession(instance) {
    const name = this.sessionName(instance);
    await this.request(`/api/sessions/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }).catch(() => null);
  }

  async getSessionStatus(instance) {
    const name = this.sessionName(instance);
    const result = await this.request(
      `/api/sessions/${encodeURIComponent(name)}`,
      { method: 'GET' }
    ).catch(() => null);
    if (!result?.ok) return null;
    return result.data;
  }

  async sendText(instance, chatJid, text) {
    const name = this.sessionName(instance);
    const body = { session: name, chatId: this.toChatId(chatJid), text };
    const result = await this.request('/api/sendText', {
      method: 'POST',
      body,
      timeoutMs: 10000,
    }).catch(() => null);
    if (!result?.ok)
      throw new Error(
        `WAHA sendText failed: ${result?.status || 503} ${result?.data?.error || ''}`
      );
    return result.data || { id: randomUUID() };
  }

  async sendMedia(instance, chatJid, media) {
    const name = this.sessionName(instance);
    const chatId = this.toChatId(chatJid);
    const endpoint = this.mediaEndpoint(media.type);
    const body = {
      session: name,
      chatId,
      file: {
        mimetype: media.mimeType || 'application/octet-stream',
        filename: media.fileName || 'file',
        data: media.data.toString('base64'),
      },
    };
    if (media.caption) body.caption = media.caption;
    if (media.url) body.file.url = media.url;

    const result = await this.request(endpoint, {
      method: 'POST',
      body,
      timeoutMs: 15000,
    }).catch(() => null);
    if (!result?.ok)
      throw new Error(`WAHA ${endpoint} failed: ${result?.status || 503}`);
    return result.data || { id: randomUUID() };
  }

  async sendSeen(instance, chatJid) {
    const name = this.sessionName(instance);
    const body = { session: name, chatId: this.toChatId(chatJid) };
    await this.request('/api/sendSeen', { method: 'POST', body }).catch(
      () => null
    );
  }

  async getChats(instance) {
    const name = this.sessionName(instance);
    const result = await this.request(
      `/api/chats?session=${encodeURIComponent(name)}`,
      { method: 'GET' }
    ).catch(() => null);
    if (!result?.ok) return [];
    return Array.isArray(result.data) ? result.data : [];
  }

  async getMessages(instance, chatJid, limit = 50, offset = 0) {
    const name = this.sessionName(instance);
    const chatId = this.toChatId(chatJid);
    const result = await this.request(
      `/api/messages?session=${encodeURIComponent(name)}&chatId=${encodeURIComponent(chatId)}&limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    ).catch(() => null);
    if (!result?.ok) return [];
    return Array.isArray(result.data) ? result.data : [];
  }

  sessionName(instance) {
    return `imobzy_${String(instance.id).replace(/-/g, '')}`;
  }

  buildSessionConfig(instance) {
    const config = {
      metadata: {
        instance_id: instance.id,
        tenant_id: instance.tenant_id,
      },
      noweb: {
        store: { enabled: true, fullSync: false },
      },
    };

    if (this.engine === 'gows') {
      delete config.noweb;
      config.gows = {
        storage: { messages: true, groups: true, chats: true },
      };
    }

    if (this.webhookUrl) {
      const webhookTarget = new URL(
        `${this.webhookUrl}/api/whatsapp/internal/waha/webhook`
      );
      if (this.apiKey) webhookTarget.searchParams.set('token', this.apiKey);
      config.webhooks = [
        {
          url: webhookTarget.toString(),
          events: ['message', 'message.any', 'session.status', 'message.ack'],
          retries: { policy: 'linear', delaySeconds: 2, attempts: 10 },
        },
      ];
    }

    return config;
  }

  toChatId(chatJid) {
    const value = String(chatJid || '').trim();
    if (value.endsWith('@s.whatsapp.net'))
      return value.replace('@s.whatsapp.net', '@c.us');
    if (value.includes('@')) return value;
    return `${value.replace(/\D/g, '')}@c.us`;
  }

  mediaEndpoint(type) {
    switch (type) {
      case 'image':
        return '/api/sendImage';
      case 'audio':
        return '/api/sendVoice';
      case 'video':
        return '/api/sendVideo';
      default:
        return '/api/sendFile';
    }
  }
}
