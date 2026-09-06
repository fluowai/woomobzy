// Global administration must never inherit a reseller's normalized role.
export async function canAccessWooControl(req, db) {
  if (req.isImpersonating || req.impersonation) return false;
  const role = String(req.profileRole ?? req.userRole ?? '')
    .toLowerCase().trim().replace(/[\s_]/g, '');
  if (!['platformowner', 'platformadmin', 'megaadmin', 'superadmin'].includes(role)) {
    return false;
  }
  if (!req.realOrgId) return true;
  const { data, error } = await db.from('organizations')
    .select('is_reseller').eq('id', req.realOrgId).maybeSingle();
  if (error) throw error;
  return data?.is_reseller === false;
}
