import { getApiUrl } from '../src/lib/api';

export interface PublicLeadContext {
  organizationId?: string;
  organizationSlug?: string;
  landingPageId?: string;
  landingPageSlug?: string;
  source?: string;
}

export interface PublicLeadInput {
  name: string;
  email?: string;
  phone: string;
  notes?: string;
  [key: string]: unknown;
}

export const buildPublicLeadPayload = (
  lead: PublicLeadInput,
  context: PublicLeadContext
) => ({
  ...lead,
  organization_id: context.organizationId || undefined,
  organization_slug: context.organizationSlug || undefined,
  site_key: context.landingPageSlug || undefined,
  campaign: context.landingPageId || undefined,
  source:
    context.source ||
    (context.landingPageSlug
      ? `Landing Page: ${context.landingPageSlug}`
      : 'Landing Page'),
  referrer_url:
    typeof window !== 'undefined' ? window.location.href : undefined,
});

export const submitPublicLead = async (
  lead: PublicLeadInput,
  context: PublicLeadContext
) => {
  const response = await fetch(getApiUrl('/api/public/leads'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPublicLeadPayload(lead, context)),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.error === 'string'
        ? data.error
        : 'Não foi possível enviar seus dados. Tente novamente.'
    );
  }

  return data;
};
