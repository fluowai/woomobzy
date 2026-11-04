import { describe, expect, it } from 'vitest';
import { getWooPlanMonthlyPrice } from '../lib/woo-control-summary.js';

describe('WooControl summary plan pricing', () => {
  it('uses the plans.price_monthly column from the current schema', () => {
    expect(getWooPlanMonthlyPrice({ price: 999, price_monthly: 199 })).toBe(199);
  });
});
