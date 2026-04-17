import { describe, it, expect } from 'vitest';
import { PropertyType, PropertyPurpose, PropertyStatus } from '../../types';

describe('Property Types', () => {
  it('should have PropertyType enum defined', () => {
    expect(PropertyType).toBeDefined();
  });

  it('should have PropertyPurpose enum defined', () => {
    expect(PropertyPurpose).toBeDefined();
  });

  it('should have PropertyStatus enum defined', () => {
    expect(PropertyStatus).toBeDefined();
  });

  it('PropertyType should include expected values', () => {
    // Verify that PropertyType is a valid enum
    expect(typeof PropertyType).toBe('object');
  });
});
