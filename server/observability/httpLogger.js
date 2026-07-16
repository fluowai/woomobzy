/**
 * Express middleware: request/response logging with correlation IDs.
 * Adds x-request-id header if missing, exposes req.log child logger.
 */
import { randomUUID } from 'crypto';
import { logger } from './logger.js';

export function httpLogger(req, res, next) {
  const start = process.hrtime.bigint();
  const requestId = req.headers['x-request-id'] || randomUUID();
  res.setHeader('x-request-id', requestId);

  req.log = logger.child({
    requestId,
    method: req.method,
    path: req.originalUrl || req.url,
  });

  res.on('finish', () => {
    const durMs = Number(process.hrtime.bigint() - start) / 1e6;
    const meta = {
      status: res.statusCode,
      durationMs: Math.round(durMs * 100) / 100,
      contentLength: res.getHeader('content-length'),
    };
    if (res.statusCode >= 500) req.log.error(meta, 'request failed');
    else if (res.statusCode >= 400) req.log.warn(meta, 'request client error');
    else req.log.info(meta, 'request');
  });

  next();
}
