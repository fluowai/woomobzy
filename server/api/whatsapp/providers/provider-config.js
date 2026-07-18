export function getWhatsAppProviderConfig() {
  const provider = normalizeProvider(
    process.env.WHATSAPP_PROVIDER || process.env.WHATSAPP_ENGINE
  );
  const whatsmeowUrl = trimUrl(
    process.env.WHATSAPP_API_URL ||
      process.env.WHATSMEOW_URL ||
      'http://127.0.0.1:3100'
  );
  const wahaUrl = trimUrl(
    process.env.WAHA_API_URL ||
      process.env.ARRAPHA_API_URL ||
      process.env.WAHA_URL ||
      'http://127.0.0.1:3000'
  );

  return {
    provider,
    publicName: 'WooTech Imob WhatsApp API 2.0',
    targetUrl: provider === 'waha' ? wahaUrl : whatsmeowUrl,
    whatsmeowUrl,
    wahaUrl,
    engine: process.env.WAHA_ENGINE || 'noweb',
    apiKey: process.env.WAHA_API_KEY || process.env.ARRAPHA_API_KEY || '',
    webhookUrl: trimUrl(
      process.env.WHATSAPP_WEBHOOK_URL ||
        process.env.PUBLIC_API_URL ||
        process.env.APP_URL ||
        ''
    ),
  };
}

export function isWahaProvider() {
  return getWhatsAppProviderConfig().provider === 'waha';
}

function normalizeProvider(value) {
  const provider = String(value || 'whatsmeow')
    .trim()
    .toLowerCase();
  if (
    ['waha', 'arrapha', 'waha-plus', 'api2', 'api-2', 'v2'].includes(provider)
  )
    return 'waha';
  return 'whatsmeow';
}

function trimUrl(value) {
  return String(value || '')
    .trim()
    .replace(/\/$/, '');
}
