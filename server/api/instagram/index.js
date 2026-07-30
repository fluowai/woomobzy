import { createProxyMiddleware } from 'http-proxy-middleware';

const TARGET = process.env.INSTAGRAM_SERVICE_URL || 'http://instagram-service:3200';

export const setupInstagramProxy = (app) => {
  const proxy = createProxyMiddleware({
    target: TARGET,
    changeOrigin: true,
    proxyTimeout: 10000,
    timeout: 10000,
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
        }
      },
    },
  });

  app.use('/api/instagram', (req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin,Accept,Content-Type,Authorization,X-Requested-With,x-company-id');
      return res.sendStatus(204);
    }
    next();
  });

  app.use('/api/instagram', proxy);

  console.log(`[Instagram] Proxy montado em /api/instagram -> ${TARGET}`);
};
