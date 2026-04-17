import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null })),
      insert: vi.fn(() => ({ data: {}, error: null })),
      update: vi.fn(() => ({ data: {}, error: null })),
      delete: vi.fn(() => ({ error: null })),
    })),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

describe('Hooks', () => {
  it('should export useProperties', async () => {
    const { useProperties } = await import('../hooks/useProperties');
    expect(useProperties).toBeDefined();
  });

  it('should export useAuth', async () => {
    const { useAuth } = await import('../hooks/useAuth');
    expect(useAuth).toBeDefined();
  });

  it('should export useLeads', async () => {
    const { useLeads } = await import('../hooks/useLeads');
    expect(useLeads).toBeDefined();
  });
});
