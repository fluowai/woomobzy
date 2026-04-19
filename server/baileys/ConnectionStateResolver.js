/**
 * ConnectionStateResolver.js — Camada de Normalização de Estado de Conexão.
 * 
 * Responsabilidades:
 *   - Atribuir pesos aos estados para evitar regressão (ex: CONNECTED > RECONNECTING)
 *   - Garantir que apenas estados "mais fortes" ou com versão superior sejam aceitos.
 *   - Normalizar eventos do Baileys para o schema do banco Imobzy.
 */

import { WA_STATES } from './StateMachine.js';

// Prioridades de estado: quanto maior, mais "estável" ou "final" é o estado.
const STATE_PRIORITY = {
  [WA_STATES.CONNECTED]:     100,
  [WA_STATES.AUTHENTICATED]: 80,
  [WA_STATES.QR_PENDING]:    50,
  [WA_STATES.CONNECTING]:    30,
  [WA_STATES.RECONNECTING]:  30,
  [WA_STATES.STALE]:         20,
  [WA_STATES.DISCONNECTED]:  0,
};

export class ConnectionStateResolver {
  /**
   * Determina se uma transição é válida baseada em prioridade e versão.
   * 
   * @param {string} currentState - Estado atual no banco.
   * @param {number} currentVersion - Versão atual no banco.
   * @param {string} newState - Candidato a novo estado.
   * @param {number} newVersion - Versão do novo evento.
   * @returns {boolean}
   */
  static shouldUpdate(currentState, currentVersion, newState, newVersion) {
    // 1. Sempre permitir se a versão for estritamente superior
    if (newVersion > currentVersion) return true;

    // 2. Se for a mesma versão (corrida no mesmo tick), usamos a prioridade
    if (newVersion === currentVersion) {
      const pCurrent = STATE_PRIORITY[currentState] || 0;
      const pNew = STATE_PRIORITY[newState] || 0;
      
      // Só permitimos se o novo estado for de maior ou igual prioridade
      return pNew >= pCurrent;
    }

    // 3. Se a versão for antiga, ignoramos (evita race condition de rede)
    return false;
  }

  /**
   * Converte o status do Baileys/Internal para o status esperado no Frontend.
   */
  static normalizeStatus(status) {
    if (status === WA_STATES.AUTHENTICATED) return 'connecting';
    if (status === WA_STATES.STALE) return 'reconnecting';
    return status;
  }
}
