import { describe, expect, it } from 'vitest';
import { buildPendingPlanSelection } from '../routes/subscription.js';

describe('seleção de plano', () => {
  it('nunca ativa a assinatura antes da confirmação do pagamento', () => {
    expect(
      buildPendingPlanSelection(
        '00000000-0000-4000-8000-000000000001',
        '2026-07-28T18:00:00.000Z'
      )
    ).toEqual({
      plan_id: '00000000-0000-4000-8000-000000000001',
      subscription_status: 'payment_required',
      selected_plan_at: '2026-07-28T18:00:00.000Z',
    });
  });
});
