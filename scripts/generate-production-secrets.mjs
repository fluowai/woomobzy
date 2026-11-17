import crypto from 'node:crypto';

console.log('====================================================');
console.log('   WooMobzy / WooTech Imob - Production Secret Generator');
console.log('====================================================\n');

const secrets = {
  EMAIL_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'), // 64 hex chars
  WHATSAPP_INTERNAL_TOKEN: crypto.randomBytes(32).toString('hex'),
  WHATSAPP_SERVICE_TOKEN: crypto.randomBytes(32).toString('hex'),
  WHATSAPP_WS_JWT_SECRET: crypto.randomBytes(32).toString('hex'),
  DOCUMENT_WEBHOOK_SECRET: crypto.randomBytes(32).toString('hex'),
  SIGNATURE_WEBHOOK_SECRET: crypto.randomBytes(32).toString('hex'),
  INSTAGRAM_INTERNAL_TOKEN: crypto.randomBytes(32).toString('hex'),
  RABBITMQ_ERLANG_COOKIE: crypto.randomBytes(24).toString('hex'),
  RABBITMQ_DEFAULT_PASS: crypto.randomBytes(16).toString('base64url'),
  ORULO_CREDENTIALS_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
  ORULO_WEBHOOK_SECRET: crypto.randomBytes(32).toString('hex'),
};

console.log('Copie e cole estas variáveis seguras no seu .env de produção:\n');
for (const [key, val] of Object.entries(secrets)) {
  console.log(`${key}=${val}`);
}
console.log('\n====================================================');

