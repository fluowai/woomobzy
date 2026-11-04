import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FormBlock from '../../components/LandingPageBlocks/FormBlock';
import PublicBlockRenderer from '../../components/LandingPageBlocks/PublicBlockRenderer';
import { Block, BlockType, LandingPageTheme } from '../../types/landingPage';

vi.mock('../../utils/tracking', () => ({
  getTrackingData: () => ({}),
  trackFacebookEvent: vi.fn(),
  trackGoogleEvent: vi.fn(),
}));

const theme: LandingPageTheme = {
  primaryColor: '#1d4ed8',
  secondaryColor: '#059669',
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  fontFamily: 'Inter',
  fontSize: {
    base: '16px',
    heading1: '48px',
    heading2: '36px',
    heading3: '24px',
  },
  borderRadius: '12px',
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
};

describe('blocos públicos de landing page', () => {
  it('renderiza um bloco de funcionalidades antes invisível', () => {
    const block = {
      id: 'features-1',
      type: BlockType.FEATURES,
      order: 0,
      visible: true,
      config: {
        columns: 2,
        features: [
          {
            title: 'Atendimento rápido',
            description: 'Resposta com contexto e segurança.',
            icon: '✓',
          },
        ],
      },
      styles: {},
    } as Block;

    render(<PublicBlockRenderer block={block} theme={theme} />);

    expect(screen.getByText('Atendimento rápido')).toBeVisible();
    expect(
      screen.getByText('Resposta com contexto e segurança.')
    ).toBeVisible();
  });

  it('não renderiza blocos marcados como ocultos', () => {
    const block = {
      id: 'hidden-1',
      type: BlockType.TEXT,
      order: 0,
      visible: false,
      config: {
        content: '<p>Conteúdo privado</p>',
        fontSize: 16,
        fontWeight: 400,
        color: '#000000',
        alignment: 'left',
      },
      styles: {},
    } as Block;

    const { container } = render(
      <PublicBlockRenderer block={block} theme={theme} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('envia o tenant e mostra confirmação após resposta da API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, leadId: 'lead-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FormBlock
        theme={theme}
        leadContext={{
          organizationId: '11111111-1111-4111-8111-111111111111',
          organizationSlug: 'imobiliaria-exemplo',
          landingPageSlug: 'captacao-premium',
        }}
        config={{
          title: 'Fale com um especialista',
          submitText: 'Enviar contato',
          successMessage: 'Contato recebido com sucesso!',
          fields: [
            {
              name: 'name',
              type: 'text',
              label: 'Nome',
              required: true,
            },
            {
              name: 'phone',
              type: 'tel',
              label: 'WhatsApp',
              required: true,
            },
          ],
        }}
      />
    );

    fireEvent.change(screen.getByLabelText(/Nome/), {
      target: { value: 'Maria Silva' },
    });
    fireEvent.change(screen.getByLabelText(/WhatsApp/), {
      target: { value: '11999999999' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar contato' }));

    await waitFor(() =>
      expect(screen.getByText('Contato recebido com sucesso!')).toBeVisible()
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      organization_id: '11111111-1111-4111-8111-111111111111',
      organization_slug: 'imobiliaria-exemplo',
      site_key: 'captacao-premium',
      name: 'Maria Silva',
      phone: '11999999999',
    });
  });
});
