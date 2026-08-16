import { getSupabaseServer } from '../lib/supabase-server.js';

export async function resolveAsaasApiKey(req, res, next) {
  if (!req.orgId) {
    return res
      .status(400)
      .json({ error: 'Organizacao nao encontrada', code: 'ORG_REQUIRED' });
  }

  try {
    const supabase = getSupabaseServer();

    let apiKey = null;

    try {
      const { data: settings } = await supabase
        .from('site_settings')
        .select('integrations')
        .eq('organization_id', req.orgId)
        .maybeSingle();

      apiKey = settings?.integrations?.asaas?.apiKey || null;
    } catch {
      apiKey = null;
    }

    if (!apiKey) {
      const { data: org } = await supabase
        .from('organizations')
        .select('gateway_api_key')
        .eq('id', req.orgId)
        .maybeSingle();

      apiKey = org?.gateway_api_key || null;
    }

    req.asaasApiKey = apiKey || process.env.ASAAS_API_KEY || null;
    next();
  } catch (error) {
    console.error('[AsaasMiddleware] Falha ao resolver API key:', error);
    req.asaasApiKey = process.env.ASAAS_API_KEY || null;
    next();
  }
}
