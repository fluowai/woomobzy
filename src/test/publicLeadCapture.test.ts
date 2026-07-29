import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildPublicLeadPayload,
  submitPublicLead,
} from '../../services/publicLeadCapture';

describe('publicLeadCapture', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, '', '/lp/fazendas-premium');
  });

  it('inclui o contexto da organização e da landing page', () => {
    expect(
      buildPublicLeadPayload(
        {
          name: 'Maria Silva',
          email: 'maria@example.com',
          phone: '11999999999',
        },
        {
          organizationId: '11111111-1111-4111-8111-111111111111',
          organizationSlug: 'imobiliaria-exemplo',
          landingPageId: '22222222-2222-4222-8222-222222222222',
          landingPageSlug: 'fazendas-premium',
        }
      )
    ).toMatchObject({
      organization_id: '11111111-1111-4111-8111-111111111111',
      organization_slug: 'imobiliaria-exemplo',
      site_key: 'fazendas-premium',
      campaign: '22222222-2222-4222-8222-222222222222',
      source: 'Landing Page: fazendas-premium',
      referrer_url: 'http://localhost:3000/lp/fazendas-premium',
    });
  });

  it('propaga a mensagem de erro devolvida pela API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Organização indisponível' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    await expect(
      submitPublicLead(
        { name: 'Maria Silva', phone: '11999999999' },
        { organizationSlug: 'imobiliaria-exemplo' }
      )
    ).rejects.toThrow('Organização indisponível');
  });
});
