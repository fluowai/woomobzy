import { vivarealService } from './vivarealService.js';
import { zapService } from './zapService.js';

const PORTAL_REGISTRY = {};

registerPortal('vivareal', vivarealService);
registerPortal('zap', zapService);

export function registerPortal(name, service) {
  PORTAL_REGISTRY[name] = service;
}

export function getPortalService(name) {
  const svc = PORTAL_REGISTRY[name];
  if (!svc) {
    const error = new Error(`Portal "${name}" não suportado.`);
    error.statusCode = 400;
    throw error;
  }
  return svc;
}

export function listPortalNames() {
  return Object.keys(PORTAL_REGISTRY);
}

export function isPortalConfigured(credentials) {
  if (!credentials || credentials.enabled === false) return false;
  if (credentials.apiKey?.trim()) return true;
  return false;
}

async function getOrgPortalConfig({ supabase, organizationId, portal }) {
  const { data, error } = await supabase
    .from('portal_integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('portal', portal)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function publishToPortal({
  supabase,
  organizationId,
  property,
  portal,
}) {
  const svc = getPortalService(portal);
  const config = await getOrgPortalConfig({ supabase, organizationId, portal });
  if (!config?.enabled) {
    const error = new Error(
      `Portal "${portal}" não configurado para esta organização.`
    );
    error.statusCode = 400;
    throw error;
  }

  const result = await svc.publish(property, config.config);
  const publishEntry = {
    listingId: result.listingId,
    url: result.url || null,
    status: 'published',
    publishedAt: new Date().toISOString(),
    syncedAt: new Date().toISOString(),
  };

  const currentPublishes = property.portal_publishes || {};
  currentPublishes[portal] = publishEntry;

  await supabase
    .from('properties')
    .update({ portal_publishes: currentPublishes })
    .eq('id', property.id)
    .eq('organization_id', organizationId);

  return { portal, ...publishEntry };
}

export async function unpublishFromPortal({
  supabase,
  organizationId,
  propertyId,
  portal,
}) {
  const svc = getPortalService(portal);
  const { data: property } = await supabase
    .from('properties')
    .select('portal_publishes')
    .eq('id', propertyId)
    .eq('organization_id', organizationId)
    .single();

  if (!property) {
    const error = new Error('Imóvel não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const publishes = property.portal_publishes || {};
  const entry = publishes[portal];
  if (entry?.listingId) {
    await svc.unpublish(entry.listingId);
  }

  delete publishes[portal];
  await supabase
    .from('properties')
    .update({ portal_publishes: publishes })
    .eq('id', propertyId)
    .eq('organization_id', organizationId);

  return { portal, status: 'unpublished' };
}

export async function getPortalPublishStatus({
  supabase,
  organizationId,
  propertyId,
  portal,
}) {
  const { data: property } = await supabase
    .from('properties')
    .select('portal_publishes')
    .eq('id', propertyId)
    .eq('organization_id', organizationId)
    .single();

  if (!property) {
    const error = new Error('Imóvel não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const publishes = property.portal_publishes || {};
  return publishes[portal] || null;
}
