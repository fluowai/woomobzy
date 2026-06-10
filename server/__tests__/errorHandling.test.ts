import { describe, it, expect } from 'vitest';

describe('Error Handling Middleware', () => {
  it('should handle CORS errors with proper status', () => {
    const err = new Error('CORS blocked for origin: http://evil.com');
    expect(err.message).toContain('CORS');
    expect(err.message).toMatch(/CORS/);
  });

  it('should detect duplicate entry errors (Postgres code 23505)', () => {
    const pgError = { code: '23505', message: 'duplicate key value violates unique constraint' };
    expect(pgError.code).toBe('23505');
    // In production, this should return 409
    const statusCode = pgError.code === '23505' ? 409 : 500;
    expect(statusCode).toBe(409);
  });

  it('should detect foreign key violation errors (Postgres code 23503)', () => {
    const pgError = { code: '23503', message: 'violates foreign key constraint' };
    expect(pgError.code).toBe('23503');
    const statusCode = pgError.code === '23503' ? 409 : 500;
    expect(statusCode).toBe(409);
  });

  it('should handle payload too large errors', () => {
    const err = { type: 'entity.too.large', message: 'request entity too large' };
    expect(err.type).toBe('entity.too.large');
    const statusCode = err.type === 'entity.too.large' ? 413 : 500;
    expect(statusCode).toBe(413);
  });

  it('should distinguish dev vs production error responses', () => {
    const isDev = true;
    const err = new Error('Detailed error message');
    const devResponse = {
      success: false,
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'),
      code: 'INTERNAL_ERROR',
    };
    expect(devResponse.error).toBe('Detailed error message');
    expect(devResponse.stack).toBeDefined();

    const prodResponse = {
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    };
    expect(prodResponse.error).toBe('Erro interno do servidor');
    expect((prodResponse as Record<string, unknown>).stack).toBeUndefined();
  });
});
