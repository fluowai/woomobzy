/**
 * server/baileys/index.js — Entry Point do Sistema WhatsApp
 *
 * Exporta o SessionManager singleton que gerencia todas as sessões.
 *
 * ARQUITECTURA:
 *   SessionManager → StateMachine (por instância)
 *                  → PersistenceManager (FS + DB)
 *                  → Baileys (socket WebSocket)
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { SessionManager } from './SessionManager.js';
import { WA_STATES } from './StateMachine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório onde as sessões Baileys são armazenadas localmente
const SESSIONS_DIR = path.join(__dirname, '../../.sessions');

// Singleton global do gerenciador de sessões
export const sessionManager = new SessionManager(SESSIONS_DIR);

// Re-exporta estados para conveniência
export { WA_STATES };

// Export padrão para retrocompatibilidade
export default sessionManager;
