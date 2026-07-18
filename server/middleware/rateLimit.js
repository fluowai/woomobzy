import rateLimit from 'express-rate-limit';

/**
 * Rate limiters especificos por tipo de rota.
 * O rate limit global (1000/15min) continua no index.js.
 * Estes limites sao MAIS RESTRITIVOS para rotas criticas.
 */

/** Login: max 10 tentativas por 15 min (anti brute force) */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_LOGIN',
  },
  keyGenerator: (req) => {
    // Rate limit por IP + email para prevenir credential stuffing
    const email = req.body?.email || 'unknown';
    return `${req.ip}:${email.toLowerCase().trim()}`;
  },
});

/** Registro: max 5 contas por IP por hora */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Limite de registros atingido. Tente novamente mais tarde.',
    code: 'RATE_LIMIT_REGISTER',
  },
});

/** Public lead capture: max 20 por IP por hora (anti spam) */
export const publicLeadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas submissoes. Aguarde antes de tentar novamente.',
    code: 'RATE_LIMIT_LEAD',
  },
});

/** WhatsApp proxy: max 60 por IP por minuto */
export const whatsappLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Limite de requisicoes WhatsApp atingido.',
    code: 'RATE_LIMIT_WHATSAPP',
  },
});

/** WhatsApp internal (sem auth): max 30 por IP por minuto */
export const whatsappInternalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Limite de requisicoes internas WhatsApp.',
    code: 'RATE_LIMIT_WHATSAPP_INTERNAL',
  },
});

/** Send welcome: max 10 por IP por hora (rota sem auth) */
export const sendWelcomeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas requisicoes de boas-vindas.',
    code: 'RATE_LIMIT_WELCOME',
  },
});

/** Quiz submission: max 30 por IP por hora */
export const quizLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Limite de respostas de quiz atingido.',
    code: 'RATE_LIMIT_QUIZ',
  },
});

/** Import/export: max 5 por IP por hora */
export const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Limite de importacoes atingido.',
    code: 'RATE_LIMIT_IMPORT',
  },
});
