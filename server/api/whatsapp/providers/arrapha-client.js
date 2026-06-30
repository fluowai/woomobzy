import { randomUUID } from 'crypto';

export class ArraphaClient {
  constructor(config) {
    this.baseUrl = config.arraphaUrl;
    this.apiKey = config.apiKey;
    this.webhookUrl = config.webhookUrl;
  }

  async health() {
    const candidates = ['/api/server/status', '/api/health', '/health'];
    const result = await this.tryCandidates(candidates, { method: 'GET' }, { allowNotFound: true });
    return {
      ok: Boolean(result?.ok),
      status: result?.status || 503,
      url: result?.url || this.baseUrl,
      data: result?.data || null,
    };
  }

  async ensureSession(instance) {
    const name = this.sessionName(instance);
    const body = {
      name,
      start: true,
      config: this.buildSessionConfig(instance),
    };

    await this.tryCandidates(
      [
        { path: '/api/sessions', body },
        { path: '/api/sessions/start', body },
        { path: `/api/sessions/${encodeURIComponent(name)}/start`, body: this.buildSessionConfig(instance) },
      ],
      { method: 'POST' },
      { allowConflict: true }
    );

    return { name };
  }

  async getSession(instance) {
    const name = this.sessionName(instance);
    const response = await this.tryCandidates(
      [`/api/sessions/${encodeURIComponent(name)}`, `/api/sessions?name=${encodeURIComponent(name)}`],
      { method: 'GET' },
      { allowNotFound: true }
    );
    return response?.data || null;
  }

  async getQRCode(instance) {
    const name = this.sessionName(instance);
    const response = await this.tryCandidates(
      [
        `/api/${encodeURIComponent(name)}/auth/qr?format=raw`,
        `/api/${encodeURIComponent(name)}/auth/qr?format=image`,
        `/api/sessions/${encodeURIComponent(name)}/auth/qr?format=raw`,
      ],
      { method: 'GET' },
      { allowNotFound: true, rawText: true }
    );

    const value = response?.data;
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.qr || value.qr_code || value.code || value.image || '';
  }

  async logout(instance) {
    const name = this.sessionName(instance);
    await this.tryCandidates(
      [
        `/api/sessions/${encodeURIComponent(name)}/logout`,
        `/api/${encodeURIComponent(name)}/auth/logout`,
        `/api/sessions/${encodeURIComponent(name)}/stop`,
      ],
      { method: 'POST' },
      { allowNotFound: true }
    );
  }

  async deleteSession(instance) {
    const name = this.sessionName(instance);
    await this.tryCandidates(
      [`/api/sessions/${encodeURIComponent(name)}`, `/api/sessions/${encodeURIComponent(name)}/delete`],
      { method: 'DELETE' },
      { allowNotFound: true }
    );
  }

  async sendText(instance, chatJid, text) {
    const name = this.sessionName(instance);
    const chatId = normalizeChatId(chatJid);
    const body = { session: name, chatId, text };

    const response = await this.tryCandidates(
      [
        { path: '/api/sendText', body },
        { path: `/api/${encodeURIComponent(name)}/sendText`, body: { chatId, text } },
        { path: `/api/${encodeURIComponent(name)}/messages/text`, body: { chatId, text } },
      ],
      { method: 'POST' }
    );

    return response?.data || { id: randomUUID() };
  }

  async sendMedia(instance, chatJid, media) {
    const name = this.sessionName(instance);
    const chatId = normalizeChatId(chatJid);
    const payload = {
      session: name,
      chatId,
      caption: media.caption || '',
      file: {
        mimetype: media.mimeType || 'application/octet-stream',
        filename: media.fileName || 'file',
        data: media.data.toString('base64'),
      },
    };
    const typedEndpoint = mediaEndpoint(media.type);

    const response = await this.tryCandidates(
      [
        { path: `/api/${typedEndpoint}`, body: payload },
        { path: `/api/${encodeURIComponent(name)}/${typedEndpoint}`, body: { chatId, caption: payload.caption, file: payload.file } },
        { path: '/api/sendFile', body: payload },
        { path: `/api/${encodeURIComponent(name)}/sendFile`, body: { chatId, caption: payload.caption, file: payload.file } },
      ],
      { method: 'POST', timeoutMs: 15000 }
    );

    return response?.data || { id: randomUUID() };
  }

  sessionName(instance) {
    return `imobzy_${String(instance.id).replace(/-/g, '')}`;
  }

  buildSessionConfig(instance) {
    const config = {
      metadata: {
        instance_id: instance.id,
        tenant_id: instance.tenant_id,
        white_label: true,
      },
    };

    if (this.webhookUrl) {
      const webhookTarget = new URL(`${this.webhookUrl}/api/whatsapp/internal/arrapha/webhook`);
      if (this.apiKey) webhookTarget.searchParams.set('token', this.apiKey);
      config.webhooks = [
        {
          url: webhookTarget.toString(),
          events: ['message', 'session.status', 'message.ack'],
        },
      ];
    }

    return config;
  }

  async tryCandidates(candidates, init = {}, options = {}) {
    let lastError;

    for (const candidate of candidates) {
      const request = typeof candidate === 'string' ? { path: candidate } : candidate;
      const result = await this.request(request.path, {
        ...init,
        body: request.body === undefined ? init.body : request.body,
        rawText: options.rawText,
      }).catch((error) => {
        lastError = error;
        return null;
      });

      if (!result) continue;
      if (result.ok || (options.allowConflict && result.status === 409) || (options.allowNotFound && result.status === 404)) {
        return result;
      }
      lastError = new Error(`Arrapha request failed: ${result.status} ${result.url}`);
    }

    if (options.allowNotFound && lastError?.status === 404) return null;
    throw lastError || new Error('Arrapha request failed');
  }

  async request(path, init = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(init.headers || {});
    if (!headers.has('Content-Type') && init.body !== undefined) headers.set('Content-Type', 'application/json');
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
}

function normalizeChatId(chatJid) {
  const value = String(chatJid || '').trim();
  if (value.endsWith('@s.whatsapp.net')) return value.replace('@s.whatsapp.net', '@c.us');
  if (value.includes('@')) return value;
  return `${value.replace(/\D/g, '')}@c.us`;
}

function mediaEndpoint(type) {
  switch (type) {
    case 'image':
      return 'sendImage';
    case 'audio':
      return 'sendVoice';
    case 'video':
      return 'sendVideo';
    default:
      return 'sendFile';
  }
}
