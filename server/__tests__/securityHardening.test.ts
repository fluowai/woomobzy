import http from 'http';
import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

async function withServer(
  app: express.Express,
  fn: (baseUrl: string) => Promise<void>
) {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  if (!addr || typeof addr === 'string') {
    server.close();
    throw new Error('Failed to bind test server');
  }
  try {
    await fn(`http://127.0.0.1:${addr.port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('P0/P1 security hardening regressions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('rejects recover-org without bearer token or with unconfirmed email', async () => {
    const authUser = {
      id: 'user-1',
      email: 'owner@acme.test',
      email_confirmed_at: null,
      confirmed_at: null,
    };

    const fakeSupabase = () => ({
      auth: {
        getUser: async () => ({ data: { user: authUser }, error: null }),
      },
      from: () => ({
        select: () => ({
          ilike: () => ({
            maybeSingle: async () => ({
              data: {
                id: 'org-1',
                name: 'Acme',
                status: 'active',
                owner_email: 'other@acme.test',
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    vi.doMock('../lib/supabase-server.js', () => ({
      getSupabaseServer: fakeSupabase,
      getSupabaseAuthServer: fakeSupabase,
    }));

    const { default: accountRouter } = await import('../routes/account.js');
    const app = express();
    app.use(express.json());
    app.use('/api/account', accountRouter);

    await withServer(app, async (baseUrl) => {
      const noTokenRes = await fetch(`${baseUrl}/api/account/recover-org`, {
        method: 'POST',
      });
      expect(noTokenRes.status).toBe(401);

      const unconfirmedRes = await fetch(`${baseUrl}/api/account/recover-org`, {
        method: 'POST',
        headers: { authorization: 'Bearer fake-token' },
      });
      expect(unconfirmedRes.status).toBe(403);
    });
  }, 15000);

  it('blocks social IDOR across divergent org_id in body and params', async () => {
    vi.doMock('../lib/supabase-server.js', () => ({
      getSupabaseServer: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              order: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }));

    const { default: socialRouter } = await import('../api/social/index.js');
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).orgId = 'org-session';
      next();
    });
    app.use('/api/social', socialRouter);

    await withServer(app, async (baseUrl) => {
      const postRes = await fetch(`${baseUrl}/api/social/posts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          org_id: 'org-victim',
          content: 'test',
          platforms: ['instagram'],
          scheduled_for: new Date().toISOString(),
        }),
      });
      expect(postRes.status).toBe(403);

      const getRes = await fetch(`${baseUrl}/api/social/posts/org-victim`);
      expect(getRes.status).toBe(403);

      const ownRes = await fetch(`${baseUrl}/api/social/posts`);
      expect(ownRes.status).toBe(200);
    });
  }, 15000);

  it('enforces requireTenant spoofing check on req.body.org_id', async () => {
    const { requireTenant } = await import('../middleware/tenant.js');
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).user = { id: 'user-1', email: 'u@test.com' };
      (req as any).orgId = 'org-real';
      next();
    });
    app.post('/protected', requireTenant, (_req, res) => {
      res.json({ ok: true });
    });

    await withServer(app, async (baseUrl) => {
      const spoofRes = await fetch(`${baseUrl}/protected`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ org_id: 'org-attacker' }),
      });
      expect(spoofRes.status).toBe(400);
    });
  }, 15000);

  it('protects wooControlAi routes with platform admin authorization', async () => {
    vi.doMock('../middleware/auth.js', () => ({
      verifyAuth: (req: any, _res: any, next: any) => {
        req.userRole = req.headers['x-test-role'] || 'admin';
        req.profileRole = req.userRole;
        req.realOrgId = null;
        next();
      },
    }));
    vi.doMock('../lib/supabase-server.js', () => ({
      getSupabaseServer: () => ({
        from: (table: string) => {
          if (table === 'saas_settings') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { global_openai_key: 'sk-test' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              gte: () => ({
                order: () => ({
                  limit: async () => ({
                    data: [
                      { provider: 'openai', total_tokens: 150, cost_usd: 0.01 },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        },
      }),
    }));

    const { default: wooControlAiRouter } = await import(
      '../routes/wooControlAi.js'
    );
    const app = express();
    app.use('/api/woo-control/ai', wooControlAiRouter);

    await withServer(app, async (baseUrl) => {
      const forbidden = await fetch(`${baseUrl}/api/woo-control/ai/status`, {
        headers: { 'x-test-role': 'admin' },
      });
      expect(forbidden.status).toBe(403);

      const allowed = await fetch(`${baseUrl}/api/woo-control/ai/status`, {
        headers: { 'x-test-role': 'megaadmin' },
      });
      expect(allowed.status).toBe(200);
      const body = await allowed.json();
      expect(body.providers.openai).toBe(true);
      expect(body.usage30d.totalTokens).toBe(150);
    });
  }, 15000);
});

