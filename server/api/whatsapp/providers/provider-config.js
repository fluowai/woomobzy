export function getWhatsAppProviderConfig() {
  const provider = normalizeProvider(process.env.WHATSAPP_PROVIDER || process.env.WHATSAPP_ENGINE);
  const whatsmeowUrl = trimUrl(process.env.WHATSAPP_API_URL || process.env.WHATSMEOW_URL || 'http://127.0.0.1:3100');
  const arraphaUrl = trimUrl(
    process.env.ARRAPHA_API_URL ||
      process.env.WAHA_API_URL ||
      process.env.WAHA_URL ||
      'http://127.0.0.1:3000'
  );

  return {
    provider,
    publicName: 'IMOBZY WhatsApp API 2.0',
    targetUrl: provider === 'arrapha' ? arraphaUrl : whatsmeowUrl,
    whatsmeowUrl,
    arraphaUrl,
    apiKey: process.env.ARRAPHA_API_KEY || process.env.WAHA_API_KEY || '',
    webhookUrl: trimUrl(process.env.WHATSAPP_WEBHOOK_URL || process.env.PUBLIC_API_URL || process.env.APP_URL || ''),
  };
}

export function isArraphaProvider() {
  return getWhatsAppProviderConfig().provider === 'arrapha';
}

function normalizeProvider(value) {
  const provider = String(value || 'whatsmeow').trim().toLowerCase();
  if (['arrapha', 'waha', 'waha-plus', 'api2', 'api-2', 'v2'].includes(provider)) return 'arrapha';
  return 'whatsmeow';
}

function trimUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}
