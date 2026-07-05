import { describe, expect, it } from 'vitest';
import {
  isInvalidSupabaseApiKeyError,
  normalizeDirectDatabaseUrl,
  shouldUseSsl,
} from '../routes/admin.js';

describe('admin organizations fallback helpers', () => {
  it('detects Supabase invalid API key errors', () => {
    expect(isInvalidSupabaseApiKeyError({ message: 'Invalid API key' })).toBe(true);
    expect(isInvalidSupabaseApiKeyError({ error: 'invalid apikey' })).toBe(true);
    expect(isInvalidSupabaseApiKeyError(new Error('permission denied for table organizations'))).toBe(false);
  });

  it('normalizes direct database URLs for pg fallback', () => {
    const url = normalizeDirectDatabaseUrl(
      'postgresql://user:pass@db.example.com:5432/postgres?sslmode=require&connect_timeout=10'
    );

    expect(url).toContain('connect_timeout=10');
    expect(url).not.toContain('sslmode=require');
  });

  it('enables SSL for Supabase pooler connections', () => {
    expect(shouldUseSsl('postgresql://user:pass@aws-1.pooler.supabase.com:5432/postgres')).toBe(true);
    expect(shouldUseSsl('postgresql://user:pass@localhost:5432/postgres')).toBe(false);
  });
});
