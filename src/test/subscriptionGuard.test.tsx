import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubscriptionGuard from '../../components/SubscriptionGuard';

const { callApiMock, toastSuccessMock } = vi.hoisted(() => ({
  callApiMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('@/src/lib/api', () => ({
  callApi: callApiMock,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    loading: false,
    profile: {
      id: 'user-1',
      role: 'admin',
      organization_id: 'org-1',
      organization: {
        id: 'org-1',
        plan_id: null,
        subscription_status: 'payment_required',
        trial_ends_at: null,
      },
    },
  }),
}));

vi.mock('../../services/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () =>
            Promise.resolve({
              data: [
                {
                  id: '00000000-0000-4000-8000-000000000001',
                  name: 'Plano Pro',
                  slug: 'pro',
                  price_monthly: 199,
                },
              ],
            }),
        }),
      }),
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: vi.fn(),
  },
}));

describe('SubscriptionGuard', () => {
  beforeEach(() => {
    callApiMock.mockReset();
    toastSuccessMock.mockReset();
    callApiMock.mockResolvedValue({
      success: true,
      requiresPayment: true,
    });
  });

  it('registra a seleção pelo backend sem tratar o JSON como Response', async () => {
    render(
      <SubscriptionGuard>
        <div>Conteúdo protegido</div>
      </SubscriptionGuard>
    );

    const planButton = await screen.findByRole('button', {
      name: /Plano Pro/i,
    });
    fireEvent.click(planButton);

    await waitFor(() => {
      expect(callApiMock).toHaveBeenCalledWith(
        '/api/subscription/select-plan',
        {
          method: 'POST',
          body: JSON.stringify({
            planId: '00000000-0000-4000-8000-000000000001',
          }),
        }
      );
    });
    expect(toastSuccessMock).toHaveBeenCalledOnce();
    expect(
      screen.getByText(/aguardando confirmação de pagamento/i)
    ).toBeInTheDocument();
  });
});
