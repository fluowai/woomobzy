/**
 * Structured logger using pino.
 * - JSON logs in production, pretty in dev.
 * - Redacts common secret fields.
 * - Attaches request-id / trace-id via child loggers.
 */
import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      '*.password',
      '*.token',
      '*.access_token',
      '*.refresh_token',
      '*.apiKey',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  transport: isProd
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' } },
  base: {
    service: process.env.SERVICE_NAME || 'woomobzy-server',
    env: process.env.NODE_ENV || 'development',
  },
});

export function childLogger(bindings) {
  return logger.child(bindings || {});
}
