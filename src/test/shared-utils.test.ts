// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  isValidUUID,
  sanitizeInput,
  extractUfFromRuralCode,
  extractGeoServerException,
  collectCoordinateBounds,
  featureCollectionToMapTarget,
} from '../../server/lib/shared-utils.js';

describe('shared-utils - isValidUUID', () => {
  it('should return true for valid UUID v4', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should return false for invalid UUID', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID('123')).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID(undefined)).toBe(false);
  });
});

describe('shared-utils - sanitizeInput', () => {
  it('should truncate to max length', () => {
    expect(sanitizeInput('abcdefghij', 5)).toBe('abcde');
  });

  it('should remove null bytes', () => {
    expect(sanitizeInput('hello\x00world', 20)).toBe('helloworld');
  });

  it('should handle empty input', () => {
    expect(sanitizeInput('', 10)).toBe('');
    expect(sanitizeInput(null, 10)).toBe('');
  });
});

describe('shared-utils - extractUfFromRuralCode', () => {
  it('should extract UF from valid CAR code', () => {
    expect(extractUfFromRuralCode('PA-1234567')).toBe('PA');
    expect(extractUfFromRuralCode('MT-9876543')).toBe('MT');
    expect(extractUfFromRuralCode('GO-1111111')).toBe('GO');
  });

  it('should return null for invalid code', () => {
    expect(extractUfFromRuralCode('invalid')).toBe(null);
    expect(extractUfFromRuralCode('')).toBe(null);
  });
});

describe('shared-utils - extractGeoServerException', () => {
  it('should extract exception text from XML', () => {
    const xml = '<ows:ExceptionText>Feature not found</ows:ExceptionText>';
    expect(extractGeoServerException(xml)).toContain('Feature not found');
  });

  it('should strip tags and return text content for non-XML-like input', () => {
    expect(extractGeoServerException('plain text')).toBe('plain text');
  });

  it('should return empty string for empty input', () => {
    expect(extractGeoServerException('')).toBe('');
  });
});

describe('shared-utils - collectCoordinateBounds', () => {
  it('should expand bounds with [lng, lat] GeoJSON coordinates', () => {
    const bounds = { minLat: 10, minLng: 20, maxLat: 30, maxLng: 40 };
    const result = collectCoordinateBounds([25, 15], bounds);
    expect(result.minLat).toBe(10);
    expect(result.minLng).toBe(20);
    expect(result.maxLat).toBe(30);
    expect(result.maxLng).toBe(40);
  });

  it('should initialize bounds from Infinity using [lng, lat] order', () => {
    const bounds = {
      minLat: Infinity,
      minLng: Infinity,
      maxLat: -Infinity,
      maxLng: -Infinity,
    };
    const result = collectCoordinateBounds([25, 15], bounds);
    expect(result.minLat).toBe(15);
    expect(result.minLng).toBe(25);
    expect(result.maxLat).toBe(15);
    expect(result.maxLng).toBe(25);
  });

  it('should handle nested coordinate arrays', () => {
    const bounds = {
      minLat: Infinity,
      minLng: Infinity,
      maxLat: -Infinity,
      maxLng: -Infinity,
    };
    const coords = [
      [
        [10, 20],
        [30, 40],
      ],
    ];
    const result = collectCoordinateBounds(coords, bounds);
    expect(result.minLat).toBe(20);
    expect(result.minLng).toBe(10);
    expect(result.maxLat).toBe(40);
    expect(result.maxLng).toBe(30);
  });
});

describe('shared-utils - featureCollectionToMapTarget', () => {
  it('should return null for empty features', () => {
    expect(featureCollectionToMapTarget({ features: [] })).toBe(null);
    expect(featureCollectionToMapTarget(null)).toBe(null);
  });

  it('should compute center and bounds for valid FeatureCollection', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [10, 20],
                [30, 40],
                [30, 20],
                [10, 40],
                [10, 20],
              ],
            ],
          },
        },
      ],
    };
    const result = featureCollectionToMapTarget(fc);
    expect(result).not.toBeNull();
    expect(result.center).toHaveLength(2);
    expect(result.center[0]).toBe(30);
    expect(result.center[1]).toBe(20);
    expect(result.bounds).toHaveLength(2);
    expect(result.featureCount).toBe(1);
  });
});
