
import { AlqueireType } from '../types';

export const CONVERSION_FACTORS = {
  ha_to_m2: 10000,
  acre_to_m2: 4046.86,
  tarea_to_m2: 3025, // Média regional Brasil
  alqueire_paulista_to_ha: 2.42,
  alqueire_mineiro_to_ha: 4.84,
  alqueire_goiano_to_ha: 4.84,
  alqueire_baiano_to_ha: 9.68,
};

/**
 * Converte área de Hectares para outras unidades
 */
export const fromHectares = (ha: number, target: 'paulista' | 'mineiro' | 'goiano' | 'baiano' | 'acre' | 'm2'): number => {
  switch (target) {
    case 'paulista': return ha / CONVERSION_FACTORS.alqueire_paulista_to_ha;
    case 'mineiro': return ha / CONVERSION_FACTORS.alqueire_mineiro_to_ha;
    case 'goiano': return ha / CONVERSION_FACTORS.alqueire_goiano_to_ha;
    case 'baiano': return ha / CONVERSION_FACTORS.alqueire_baiano_to_ha;
    case 'acre': return (ha * CONVERSION_FACTORS.ha_to_m2) / CONVERSION_FACTORS.acre_to_m2;
    case 'm2': return ha * CONVERSION_FACTORS.ha_to_m2;
    default: return ha;
  }
};

/**
 * Converte qualquer unidade para Hectares (Base do sistema)
 */
export const toHectares = (value: number, source: 'ha' | 'paulista' | 'mineiro' | 'goiano' | 'baiano' | 'acre' | 'm2'): number => {
  switch (source) {
    case 'ha': return value;
    case 'paulista': return value * CONVERSION_FACTORS.alqueire_paulista_to_ha;
    case 'mineiro': return value * CONVERSION_FACTORS.alqueire_mineiro_to_ha;
    case 'goiano': return value * CONVERSION_FACTORS.alqueire_goiano_to_ha;
    case 'baiano': return value * CONVERSION_FACTORS.alqueire_baiano_to_ha;
    case 'acre': return (value * CONVERSION_FACTORS.acre_to_m2) / CONVERSION_FACTORS.ha_to_m2;
    case 'm2': return value / CONVERSION_FACTORS.ha_to_m2;
    default: return value;
  }
};

/**
 * Helper para pegar o fator por tipo de Alqueire
 */
export const getAlqueireFactor = (type: AlqueireType): number => {
  if (type.includes('Paulista')) return CONVERSION_FACTORS.alqueire_paulista_to_ha;
  if (type.includes('Baiano')) return CONVERSION_FACTORS.alqueire_baiano_to_ha;
  return CONVERSION_FACTORS.alqueire_mineiro_to_ha; // Mineiro e Goiano são iguais
};

/**
 * Formata área para exibição
 */
export const formatArea = (value: number, unit: string = 'ha'): string => {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unit}`;
};
