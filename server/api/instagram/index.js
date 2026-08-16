import { createProxyMiddleware } from 'http-proxy-middleware';

const TARGET =
  process.env.INSTAGRAM_SERVICE_URL || 'http://instagram-service:3200';

const rewriteInstagramPath = (path) => {
  if (path === '/ws' || path.startsWith('/ws?')) {
    return path;
  }

  return path.startsWith('/api/instagram') ? path : `/api/instagram${path}`;
};

export const setupInstagramProxy = (app, server) => {
  const proxy = createProxyMiddleware({
    target: TARGET,
    changeOrigin: true,
    proxyTimeout: 10000,
    timeout: 10000,
    pathRewrite: rewriteInstagramPath,
    on: {
      proxyReq: (proxyReq, req) => {
        console.log(
          `[Instagram Proxy] ${req.method} ${req.originalUrl || req.url} -> ${TARGET}${proxyReq.path}`
        );
      },
      error: (err, req, res) => {
        console.error('[Instagram Proxy Error]', err.message);
        if (res && typeof res.status === 'function') {
          res.status(502).json({
            error: 'Servico Instagram Indisponivel',
            code: 'INSTAGRAM_SERVICE_UNREACHABLE',
          });
        } else if (res && typeof res.destroy === 'function') {
          res.destroy();
        }
      },
    },
  });

  app.use('/api/instagram', (req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,PATCH,DELETE,OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin,Accept,Content-Type,Authorization,X-Requested-With,x-company-id'
      );
      return res.sendStatus(204);
    }
    next();
  });

  app.use('/api/instagram', proxy);

  // WebSocket upgrade passthrough (Instagram Dashboard usa /api/instagram/ws).
  // O instagram-service valida a empresa no primeiro frame (auth), sem token de upgrade.
  if (server) {
    server.on('upgrade', (req, socket, head) => {
      if (req.url?.startsWith('/api/instagram/ws')) {
        proxy.upgrade(req, socket, head);
      }
    });
  }

  console.log(`[Instagram] Proxy montado em /api/instagram -> ${TARGET}`);
};
