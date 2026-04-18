/**
 * StateMachine.js — Máquina de Estados para Conexão WhatsApp
 *
 * Estados válidos e transições permitidas:
 *
 *  DISCONNECTED ──► CONNECTING ──► QR_PENDING ──► AUTHENTICATED ──► CONNECTED
 *       ▲               │                                                │
 *       │               └─────────────────────────────────────────────► │
 *       │                                                                │
 *       └────────────────── RECONNECTING ◄── STALE ◄────────────────────┘
 *
 * Qualquer estado pode ir para DISCONNECTED (terminal/reset).
 */

export const WA_STATES = Object.freeze({
  DISCONNECTED:  'disconnected',
  CONNECTING:    'connecting',
  QR_PENDING:    'qr_pending',
  AUTHENTICATED: 'authenticated',
  CONNECTED:     'connected',
  STALE:         'stale',
  RECONNECTING:  'reconnecting',
});

// Mapa de transições permitidas por estado
const ALLOWED_TRANSITIONS = {
  [WA_STATES.DISCONNECTED]:  [WA_STATES.CONNECTING],
  [WA_STATES.CONNECTING]:    [WA_STATES.QR_PENDING, WA_STATES.AUTHENTICATED, WA_STATES.DISCONNECTED, WA_STATES.RECONNECTING],
  [WA_STATES.QR_PENDING]:    [WA_STATES.AUTHENTICATED, WA_STATES.DISCONNECTED, WA_STATES.CONNECTING],
  [WA_STATES.AUTHENTICATED]: [WA_STATES.CONNECTED, WA_STATES.DISCONNECTED],
  [WA_STATES.CONNECTED]:     [WA_STATES.STALE, WA_STATES.DISCONNECTED, WA_STATES.RECONNECTING],
  [WA_STATES.STALE]:         [WA_STATES.RECONNECTING, WA_STATES.DISCONNECTED],
  [WA_STATES.RECONNECTING]:  [WA_STATES.CONNECTING, WA_STATES.CONNECTED, WA_STATES.DISCONNECTED],
};

export class ConnectionStateMachine {
  constructor(instanceId) {
    this.instanceId = instanceId;
    this.state = WA_STATES.DISCONNECTED;
    this.history = [];
    this.listeners = new Map(); // event → Set<callback>
  }

  /**
   * Tenta transicionar para um novo estado.
   * Lança erro se a transição não for permitida.
   */
  transition(newState, reason = '') {
    const allowed = ALLOWED_TRANSITIONS[this.state] || [];

    // Sempre permite ir para DISCONNECTED (reset de emergência)
    if (newState !== WA_STATES.DISCONNECTED && !allowed.includes(newState)) {
      console.warn(
        `[StateMachine:${this.instanceId}] ⛔ Transição inválida: ${this.state} → ${newState}. Ignorando.`
      );
      return false;
    }

    const previous = this.state;
    this.state = newState;
    this.history.push({ from: previous, to: newState, reason, at: new Date().toISOString() });

    console.log(
      `[StateMachine:${this.instanceId}] 🔄 ${previous} → ${newState}${reason ? ` (${reason})` : ''}`
    );

    this._emit('transition', { previous, current: newState, reason });
    this._emit(newState, { previous, reason });
    return true;
  }

  /** Retorna o estado atual */
  getState() {
    return this.state;
  }

  /** Verifica se está em determinado estado */
  is(state) {
    return this.state === state;
  }

  /** Verifica se a instância está operacionalmente ativa */
  isOperational() {
    return this.state === WA_STATES.CONNECTED;
  }

  /** Registra um listener para um evento de estado */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event)?.delete(callback); // retorna unsubscribe
  }

  _emit(event, data) {
    const set = this.listeners.get(event);
    if (set) set.forEach(cb => { try { cb(data); } catch (e) { /* noop */ } });
  }

  /** Retorna histórico de transições */
  getHistory() {
    return [...this.history];
  }

  /** Reseta a máquina para DISCONNECTED */
  reset(reason = 'manual reset') {
    this.state = WA_STATES.DISCONNECTED;
    this.history = [];
    this._emit('transition', { previous: 'any', current: WA_STATES.DISCONNECTED, reason });
  }
}
