import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectionStateResolver } from '../ConnectionStateResolver.js';
import { WA_STATES } from '../StateMachine.js';

describe('ConnectionStateResolver', () => {
  it('deve permitir transição para uma versão superior', () => {
    const result = ConnectionStateResolver.shouldUpdate(
      WA_STATES.CONNECTED, 10,
      WA_STATES.RECONNECTING, 11
    );
    expect(result).toBe(true);
  });

  it('deve ignorar transição para uma versão inferior (Stale Event)', () => {
    const result = ConnectionStateResolver.shouldUpdate(
      WA_STATES.CONNECTED, 15,
      WA_STATES.RECONNECTING, 10
    );
    expect(result).toBe(false);
  });

  it('deve usar prioridade se as versões forem iguais (Race Condition Tick)', () => {
    // CONNECTED tem prioridade maior que RECONNECTING
    const result = ConnectionStateResolver.shouldUpdate(
      WA_STATES.CONNECTED, 10,
      WA_STATES.RECONNECTING, 10
    );
    expect(result).toBe(false);

    // RECONNECTING tem mesma prioridade que CONNECTING, permitimos se for o mesmo tick
    const result2 = ConnectionStateResolver.shouldUpdate(
      WA_STATES.CONNECTING, 10,
      WA_STATES.RECONNECTING, 10
    );
    expect(result2).toBe(true);
  });

  it('deve normalizar estados internos para o banco/frontend', () => {
    expect(ConnectionStateResolver.normalizeStatus(WA_STATES.AUTHENTICATED)).toBe('connecting');
    expect(ConnectionStateResolver.normalizeStatus(WA_STATES.STALE)).toBe('reconnecting');
    expect(ConnectionStateResolver.normalizeStatus(WA_STATES.CONNECTED)).toBe('connected');
  });
});
