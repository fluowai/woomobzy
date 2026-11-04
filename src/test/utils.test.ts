import { describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Utils - Environment', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should have localStorage available', () => {
    expect(localStorage).toBeDefined();
    expect(typeof localStorage.getItem).toBe('function');
    expect(typeof localStorage.setItem).toBe('function');
  });

  it('should store and retrieve values from localStorage', () => {
    localStorage.setItem('test-key', 'test-value');
    expect(localStorage.getItem('test-key')).toBe('test-value');
  });

  it('should remove values from localStorage', () => {
    localStorage.setItem('test-key', 'test-value');
    localStorage.removeItem('test-key');
    expect(localStorage.getItem('test-key')).toBeNull();
  });
});
