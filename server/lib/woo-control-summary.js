export function getWooPlanMonthlyPrice(plan) {
  return Number(plan?.price_monthly ?? 0) || 0;
}
