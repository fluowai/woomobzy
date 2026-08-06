import { describe, expect, it } from 'vitest';
import {
  computeExpiry,
  DURATION_PRESETS,
  LicenseDurationError,
  resolveDurationPreset,
} from '../lib/licensing/duration.js';

describe('licensing duration presets', () => {
  const FIXED = new Date('2026-03-10T12:00:00.000Z');

  it('expõe os presets esperados', () => {
    expect(DURATION_PRESETS.map((p) => p.id)).toEqual([
      'monthly',
      'year1',
      'year2',
      'year5',
      'lifetime',
    ]);
  });

  it('calcula expiração mensal a partir da data base', () => {
    const expiry = computeExpiry({ presetId: 'monthly', from: FIXED });
    expect(expiry).toBe('2026-04-10T12:00:00.000Z');
  });

  it('calcula 1, 2 e 5 anos', () => {
    expect(computeExpiry({ presetId: 'year1', from: FIXED })).toBe(
      '2027-03-10T12:00:00.000Z'
    );
    expect(computeExpiry({ presetId: 'year2', from: FIXED })).toBe(
      '2028-03-10T12:00:00.000Z'
    );
    expect(computeExpiry({ presetId: 'year5', from: FIXED })).toBe(
      '2031-03-10T12:00:00.000Z'
    );
  });

  it('vitalícia não tem expiração (null)', () => {
    expect(computeExpiry({ presetId: 'lifetime', from: FIXED })).toBeNull();
  });

  it('usa o preset padrão quando ausente', () => {
    const expiry = computeExpiry({ from: FIXED });
    expect(expiry).toBe(computeExpiry({ presetId: 'year1', from: FIXED }));
  });

  it('data do calendário sobrescreve o preset', () => {
    const custom = new Date('2029-12-01T00:00:00.000Z');
    expect(
      computeExpiry({ presetId: 'lifetime', customDate: custom, from: FIXED })
    ).toBe('2029-12-01T00:00:00.000Z');
    expect(
      computeExpiry({ presetId: 'year5', customDate: custom, from: FIXED })
    ).toBe('2029-12-01T00:00:00.000Z');
  });

  it('aceita customDate como string ISO', () => {
    expect(
      computeExpiry({
        presetId: 'year1',
        customDate: '2029-12-01T00:00:00.000Z',
      })
    ).toBe('2029-12-01T00:00:00.000Z');
  });

  it('trata 31 de janeiro + 1 mês como fim de fevereiro', () => {
    const jan31 = new Date('2026-01-31T12:00:00.000Z');
    expect(computeExpiry({ presetId: 'monthly', from: jan31 })).toBe(
      '2026-02-28T12:00:00.000Z'
    );
  });

  it('rejeita preset desconhecido', () => {
    expect(() => computeExpiry({ presetId: 'decade' })).toThrow(
      LicenseDurationError
    );
  });

  it('rejeita data do calendário inválida', () => {
    expect(() => computeExpiry({ customDate: 'não-é-uma-data' })).toThrow(
      LicenseDurationError
    );
  });

  it('resolveDurationPreset normaliza ausência e valores inválidos', () => {
    expect(resolveDurationPreset()).toEqual(resolveDurationPreset('year1'));
    expect(resolveDurationPreset('')).toEqual(resolveDurationPreset('year1'));
    expect(() => resolveDurationPreset('nope')).toThrow(LicenseDurationError);
  });
});
