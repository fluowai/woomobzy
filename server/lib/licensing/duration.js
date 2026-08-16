/**
 * Durações de licença (presets) — cálculo de expiração para o fluxo de
 * criação automática de licenças (revendas e clientes).
 *
 * Um preset calcula `expires_at` a partir de hoje; "vitalícia" não tem
 * expiração (null). Um calendário pode sobrescrever com uma data específica
 * quando o usuário desmarca "Preset calcula a expiração".
 */

export class LicenseDurationError extends Error {
  constructor(message, code = 'LICENSE_DURATION_ERROR') {
    super(message);
    this.name = 'LicenseDurationError';
    this.code = code;
  }
}

export const DURATION_PRESETS = Object.freeze([
  { id: 'monthly', label: 'Mensal', months: 1 },
  { id: 'year1', label: '1 ano', months: 12 },
  { id: 'year2', label: '2 anos', months: 24 },
  { id: 'year5', label: '5 anos', months: 60 },
  { id: 'lifetime', label: 'Vitalícia', months: null },
]);

export const DEFAULT_DURATION_PRESET = 'year1';

export function resolveDurationPreset(presetId) {
  if (presetId === undefined || presetId === null || presetId === '') {
    return DURATION_PRESETS.find((p) => p.id === DEFAULT_DURATION_PRESET);
  }
  const preset = DURATION_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    throw new LicenseDurationError(
      'Preset de duração inválido',
      'INVALID_DURATION_PRESET'
    );
  }
  return preset;
}

function addMonths(date, months) {
  const result = new Date(date.getTime());
  const originalDay = result.getUTCDate();
  result.setUTCMonth(result.getUTCMonth() + months);
  if (result.getUTCDate() !== originalDay) {
    result.setUTCDate(0);
  }
  return result;
}

/**
 * Calcula a expiração de uma licença.
 *
 * @param {object} options
 * @param {string} [options.presetId] Preset de duração (ex.: 'year1', 'lifetime').
 * @param {string|Date|null} [options.customDate] Data específica do calendário;
 *   quando informada sobrescreve o preset (null/'' = usa o preset).
 * @param {Date|number} [options.from] Data base (padrão: agora).
 * @returns {string|null} ISO do `expires_at` ou null (vitalícia / data vazia).
 */
export function computeExpiry({ presetId, customDate = null, from } = {}) {
  const base = from === undefined ? new Date() : new Date(from);

  if (customDate !== null && customDate !== undefined && customDate !== '') {
    const time = Date.parse(customDate);
    if (Number.isNaN(time)) {
      throw new LicenseDurationError(
        'Data de expiração inválida',
        'INVALID_EXPIRY_DATE'
      );
    }
    return new Date(time).toISOString();
  }

  const preset = resolveDurationPreset(presetId);
  if (preset.months === null) return null;
  return addMonths(base, preset.months).toISOString();
}
