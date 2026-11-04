import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing in tenant handler');
    return res
      .status(500)
      .json({ error: 'Internal Server Error: Missing credentials' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  try {
    const host = req.headers.host || '';
    const cleanHost = host.replace(/^www\./, '').split(':')[0]; // Remove port and www
    const slugParams = req.query.slug;

    let organization = null;
    let orgError = null;

    // 1. If a specific slug is passed (useful for dev or explicit routing)
    if (slugParams) {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', slugParams)
        .single();
      organization = data;
      orgError = error;
    }
    // 2. Try to resolve by Custom Domain
    else {
      const { data: domainData, error: domainError } = await supabase
        .from('organizations')
        .select('*')
        .eq('custom_domain', cleanHost)
        .maybeSingle();

      if (domainData) {
        organization = domainData;
      }
      // 3. Try to resolve by Subdomain (e.g. slug.imobzy.com.br)
      else if (cleanHost.includes('.')) {
        const potentialSlug = cleanHost.split('.')[0];
        const { data: subData, error: subError } = await supabase
          .from('organizations')
          .select('*')
          .eq('slug', potentialSlug)
          .maybeSingle();

        if (subData) {
          organization = subData;
        }
      }
    }

    // Fallback for local development (localhost) ONLY
    if (
      !organization &&
      process.env.NODE_ENV !== 'production' &&
      (cleanHost === 'localhost' || cleanHost === '127.0.0.1')
    ) {
      console.log('⚠️ Local development fallback: using first organization');
      const { data: fbData } = await supabase
        .from('organizations')
        .select('*')
        .limit(1)
        .single();
      organization = fbData;
    }

    if (!organization) {
      return res.status(404).json({
        error: 'Organização não encontrada para o domínio ' + cleanHost,
      });
    }

    // Fetch site settings
    const { data: settings } = await supabase
      .from('site_settings')
      .select('*')
      .eq('organization_id', organization.id)
      .single();

    return res.status(200).json({
      id: organization.id,
      name: organization.name,
      subdomain: organization.slug, // Subdomain usually matches the slug
      customDomain: organization.custom_domain,
      settings: settings || {},
      plan: 'enterprise', // Or fetch from plans table if necessary
    });
  } catch (error) {
    console.error('Error fetching/resolving tenant:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
