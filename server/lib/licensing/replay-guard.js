import { sha256Hex } from './crypto.js';

export class ReplayDetectedError extends Error {
  constructor(nonceHash) {
    super('Nonce já utilizado: replay detectado');
    this.name = 'ReplayDetectedError';
    this.code = 'LICENSE_NONCE_REPLAY';
    this.nonceHash = nonceHash;
  }
}

export class NonceExpiredError extends Error {
  constructor() {
    super('Nonce expirado');
    this.name = 'NonceExpiredError';
    this.code = 'LICENSE_NONCE_EXPIRED';
  }
}

/**
 * Guard anti-replay para nonces de ativação/heartbeat.
 * Guarda apenas o hash SHA-256 do nonce (nunca o valor bruto).
 * Entradas antigas são removidas por TTL para evitar vazamento de memória.
 */
export class ReplayGuard {
  constructor({ maxEntries = 100_000 } = {}) {
    this.maxEntries = maxEntries;
    this.entries = new Map(); // hash -> expiresAt
  }

  prune(now = Date.now()) {
    for (const [hash, expiresAt] of this.entries) {
      if (expiresAt <= now) this.entries.delete(hash);
    }
  }

  /**
   * Tenta consumir um nonce. Lança ReplayDetectedError se já visto dentro da
   * janela; retorna true se aceito. `ttlMs` é o tempo de vida do nonce.
   */
  consume(nonce, { ttlMs = 30 * 60 * 1000, now = Date.now() } = {}) {
    if (!nonce || typeof nonce !== 'string' || nonce.length < 16) {
      throw new ReplayDetectedError('invalid-nonce');
    }
    const hash = sha256Hex(nonce);
    const existing = this.entries.get(hash);
    if (existing && existing > now) {
      throw new ReplayDetectedError(hash);
    }
    if (this.entries.size >= this.maxEntries) {
      this.prune(now);
      if (this.entries.size >= this.maxEntries) {
        const oldestKey = this.entries.keys().next().value;
        if (oldestKey !== undefined) this.entries.delete(oldestKey);
      }
    }
    this.entries.set(hash, now + ttlMs);
    return true;
  }

  has(nonce) {
    if (!nonce) return false;
    return this.entries.get(sha256Hex(nonce)) > Date.now();
  }

  clear() {
    this.entries.clear();
  }

  get size() {
    return this.entries.size;
  }
}
