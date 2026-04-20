/**
 * PersistenceManager.js — Gerenciador de Persistência de Credenciais
 *
 * PRINCÍPIO FUNDAMENTAL:
 *   O arquivo creds.json no filesystem é a FONTE DE VERDADE.
 *   O banco de dados é apenas um CACHE de backup para recuperação após perda do filesystem.
 *
 * Fluxo de escrita:
 *   Baileys salva em arquivo → FS é validado → DB é atualizado (debounced)
 *
 * Fluxo de leitura (boot):
 *   Tenta FS primeiro → Fallback para DB → Escreve FS do DB → Valida
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Supabase lazy singleton
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let _supabaseInstance = null;
const getSupabase = () => {
  if (_supabaseInstance) return _supabaseInstance;
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();
  if (!url) throw new Error('SUPABASE_URL é obrigatório');
  _supabaseInstance = createClient(url, key);
  return _supabaseInstance;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Campos mínimos que um creds.json válido do Baileys deve ter
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const REQUIRED_CREDS_FIELDS = ['noiseKey', 'signedIdentityKey', 'signedPreKey', 'registrationId'];

export class PersistenceManager {
  constructor(sessionsDir) {
    this.sessionsDir = sessionsDir;
    // Lock Map: instanceId → Promise (para serializar escritas)
    this._writeLocks = new Map();
    // Debounce timers: instanceId → setTimeout handle
    this._debounceTimers = new Map();
  }

  // ──────────────────────────────────────────────
  // Paths
  // ──────────────────────────────────────────────
  getSessionPath(instanceId) {
    return path.join(this.sessionsDir, instanceId);
  }

  getCredsPath(instanceId) {
    return path.join(this.getSessionPath(instanceId), 'creds.json');
  }

  // ──────────────────────────────────────────────
  // Validação de Credenciais
  // ──────────────────────────────────────────────
  /**
   * Valida se um objeto de credenciais tem os campos obrigatórios.
   * @param {object} creds
   * @returns {boolean}
   */
  validateCreds(creds) {
    if (!creds || typeof creds !== 'object') return false;
    for (const field of REQUIRED_CREDS_FIELDS) {
      if (!creds[field]) {
        console.warn(`[PersistenceManager] ⚠️ Campo obrigatório ausente: ${field}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Lê e valida as credenciais do filesystem.
   * @param {string} instanceId
   * @returns {object|null}
   */
  readCredsFromFS(instanceId) {
    const credsPath = this.getCredsPath(instanceId);
    if (!fs.existsSync(credsPath)) return null;
    try {
      const raw = fs.readFileSync(credsPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!this.validateCreds(parsed)) {
        console.warn(`[PersistenceManager] ❌ creds.json inválido para ${instanceId}. Deletando.`);
        this.deleteSessionFiles(instanceId);
        return null;
      }
      return parsed;
    } catch (e) {
      console.error(`[PersistenceManager] ❌ Erro ao ler creds.json de ${instanceId}:`, e.message);
      this.deleteSessionFiles(instanceId);
      return null;
    }
  }

  // ──────────────────────────────────────────────
  // Escrita Atômica no Filesystem
  // ──────────────────────────────────────────────
  /**
   * Escreve um arquivo de forma atômica (temp + rename).
   * Garante que o arquivo nunca ficará meio-escrito em caso de crash.
   */
  writeAtomic(filePath, content) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${filePath}.tmp.${Date.now()}`;
    try {
      fs.writeFileSync(tmp, typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'utf8');
      fs.renameSync(tmp, filePath);
    } catch (e) {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      throw e;
    }
  }

  // ──────────────────────────────────────────────
  // Lock por Instância (Mutex simples)
  // ──────────────────────────────────────────────
  /**
   * Executa uma função com lock exclusivo por instanceId.
   * Garante que apenas uma escrita acontece por vez para cada instância.
   */
  async withLock(instanceId, fn) {
    const current = this._writeLocks.get(instanceId) || Promise.resolve();
    const next = current.then(fn).catch(e => {
      console.error(`[PersistenceManager] ❌ Erro dentro do lock de ${instanceId}:`, e.message);
    });
    this._writeLocks.set(instanceId, next);
    await next;
    // Limpeza: se não há mais operações enfileiradas, remove o lock
    if (this._writeLocks.get(instanceId) === next) {
      this._writeLocks.delete(instanceId);
    }
  }

  // ──────────────────────────────────────────────
  // Persistência no Banco (com Debounce + Lock)
  // ──────────────────────────────────────────────
  /**
   * Agenda salvamento das creds no banco com debounce de 1.5s.
   * Lê SEMPRE do arquivo (fonte de verdade), nunca de state.creds.
   * @param {string} instanceId
   */
  scheduleDBSync(instanceId) {
    // Cancela debounce anterior se existir
    if (this._debounceTimers.has(instanceId)) {
      clearTimeout(this._debounceTimers.get(instanceId));
    }

    const timer = setTimeout(async () => {
      this._debounceTimers.delete(instanceId);
      await this.withLock(instanceId, async () => {
        const creds = this.readCredsFromFS(instanceId);
        if (!creds) {
          console.warn(`[PersistenceManager] ⚠️ Sync cancelado: creds inválidas para ${instanceId}`);
          return;
        }
        try {
          const { error } = await getSupabase()
            .from('whatsapp_instances')
            .update({ session_data: creds, updated_at: new Date().toISOString() })
            .eq('id', instanceId);

          if (error) {
            console.error(`[PersistenceManager] ❌ Falha ao sincronizar DB para ${instanceId}:`, error.message);
          } else {
            console.log(`[PersistenceManager] ✅ Credenciais sincronizadas com DB para ${instanceId}`);
          }
        } catch (e) {
          console.error(`[PersistenceManager] ❌ Exceção no sync DB:`, e.message);
        }
      });
    }, 1500);

    this._debounceTimers.set(instanceId, timer);
  }

  // ──────────────────────────────────────────────
  // Restauração de Sessão
  // ──────────────────────────────────────────────
  /**
   * Tenta restaurar a sessão para uma instância.
   * 1. Verifica FS local (fonte de verdade)
   * 2. Fallback: tenta recuperar do banco (cache)
   * 3. Valida integridade antes de usar
   *
   * @returns {boolean} true se as credenciais estão prontas no FS
   */
  async ensureSessionReady(instanceId) {
    const sessionPath = this.getSessionPath(instanceId);
    const credsPath = this.getCredsPath(instanceId);

    // 1. Verificar se já existe no FS
    if (fs.existsSync(credsPath)) {
      const creds = this.readCredsFromFS(instanceId); // valida ao ler
      if (creds) {
        console.log(`[PersistenceManager] ✅ Credenciais encontradas no FS para ${instanceId}`);
        return true;
      }
      // Inválidas → vai tentar DB
    }

    // 2. Tentar recuperar do banco
    console.log(`[PersistenceManager] 🔍 Tentando recuperar sessão do DB para ${instanceId}...`);
    try {
      const { data, error } = await getSupabase()
        .from('whatsapp_instances')
        .select('session_data')
        .eq('id', instanceId)
        .single();

      if (error || !data?.session_data) {
        console.log(`[PersistenceManager] ℹ️ Sem session_data no DB para ${instanceId}. QR necessário.`);
        return false;
      }

      // Valida o que veio do banco antes de usar
      if (!this.validateCreds(data.session_data)) {
        console.warn(`[PersistenceManager] ❌ session_data do DB inválido para ${instanceId}. QR necessário.`);
        // Limpa o banco também para não tentar novamente
        await getSupabase()
          .from('whatsapp_instances')
          .update({ session_data: null })
          .eq('id', instanceId);
        return false;
      }

      // Escreve no FS de forma atômica
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }
      this.writeAtomic(credsPath, data.session_data);
      console.log(`[PersistenceManager] ♻️ Sessão restaurada do DB para o FS: ${instanceId}`);
      return true;
    } catch (e) {
      console.error(`[PersistenceManager] ❌ Erro ao recuperar sessão do DB:`, e.message);
      return false;
    }
  }

  // ──────────────────────────────────────────────
  // Limpeza
  // ──────────────────────────────────────────────
  /**
   * Remove arquivos de sessão do filesystem
   */
  deleteSessionFiles(instanceId) {
    const sessionPath = this.getSessionPath(instanceId);
    if (fs.existsSync(sessionPath)) {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log(`[PersistenceManager] 🗑️ Arquivos de sessão removidos: ${instanceId}`);
      } catch (e) {
        console.error(`[PersistenceManager] ❌ Falha ao remover sessão do FS:`, e.message);
      }
    }
  }

  /**
   * Remove credenciais tanto do FS quanto do banco
   */
  async clearSession(instanceId) {
    this.deleteSessionFiles(instanceId);
    // Cancela debounces pendentes
    if (this._debounceTimers.has(instanceId)) {
      clearTimeout(this._debounceTimers.get(instanceId));
      this._debounceTimers.delete(instanceId);
    }
    try {
      await getSupabase()
        .from('whatsapp_instances')
        .update({ session_data: null, status: 'disconnected', qr_code: null })
        .eq('id', instanceId);
    } catch (e) {
      console.error(`[PersistenceManager] ❌ Falha ao limpar sessão no DB:`, e.message);
    }
  }

  // ──────────────────────────────────────────────
  // Status do Banco
  // ──────────────────────────────────────────────
  async updateStatus(instanceId, status, extras = {}) {
    try {
      const timestamp = new Date().toISOString();
      const update = { status, updated_at: timestamp, ...extras };

      if (status === 'connected') {
        update.qr_code = null;
        update.last_connected_at = timestamp;
      }

      const { error } = await getSupabase()
        .from('whatsapp_instances')
        .update(update)
        .eq('id', instanceId);

      if (error) {
        console.error(`[PersistenceManager] ❌ Erro ao atualizar status (${status}):`, error.message);
      } else {
        console.log(`[PersistenceManager] ✅ Status atualizado: ${instanceId} ➔ ${status}`);
      }
    } catch (e) {
      console.error(`[PersistenceManager] ❌ Exceção ao atualizar status:`, e.message);
    }
  }

  async saveQRCode(instanceId, qrCode) {
    try {
      const { error } = await getSupabase()
        .from('whatsapp_instances')
        .update({ 
          qr_code: qrCode, 
          status: 'qr_pending', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', instanceId);

      if (error) {
        console.error(`[PersistenceManager] ❌ Erro ao salvar QR:`, error.message);
      } else {
        console.log(`[PersistenceManager] 📲 QR Code salvo para ${instanceId}`);
      }
    } catch (e) {
      console.error(`[PersistenceManager] ❌ Exceção ao salvar QR:`, e.message);
    }
  }

  async getSupabaseClient() {
    return getSupabase();
  }
}
