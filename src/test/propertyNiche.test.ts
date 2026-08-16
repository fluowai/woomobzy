import { describe, expect, it } from 'vitest';
import {
  isRuralProperty,
  isUrbanProperty,
  normalizeNiche,
} from '../../utils/propertyNiche';

describe('property niche classification', () => {
  it('normalizes organization and property niches', () => {
    expect(normalizeNiche('rural')).toBe('rural');
    expect(normalizeNiche('traditional')).toBe('urbano');
    expect(normalizeNiche('urban')).toBe('urbano');
    expect(normalizeNiche('urbano')).toBe('urbano');
  });

  it('classifies rural properties by explicit niche', () => {
    expect(
      isRuralProperty({ niche: 'rural', property_type: 'Apartamento' })
    ).toBe(true);
    expect(
      isUrbanProperty({ niche: 'rural', property_type: 'Apartamento' })
    ).toBe(false);
  });

  it('classifies rural properties by legacy type when niche is missing', () => {
    expect(isRuralProperty({ property_type: 'Fazenda' })).toBe(true);
    expect(isRuralProperty({ property_type: 'Sítio' })).toBe(true);
    expect(isRuralProperty({ property_type: 'Chacara' })).toBe(true);
    expect(isRuralProperty({ property_type: 'Área Produtiva' })).toBe(true);
  });

  it('classifies urban properties by explicit niche or urban type', () => {
    expect(isUrbanProperty({ niche: 'urbano', property_type: 'Fazenda' })).toBe(
      true
    );
    expect(isUrbanProperty({ property_type: 'Apartamento' })).toBe(true);
    expect(isUrbanProperty({ property_type: 'Galpão Industrial' })).toBe(true);
  });
});
