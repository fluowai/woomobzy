import jwt from 'jsonwebtoken';
import { supabase } from '../index.js';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

export async function resolveUserCompany(userId, requestedCompanyId) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  if (profile.role === 'superadmin' && requestedCompanyId) {
    return requestedCompanyId;
  }

  return profile.organization_id || null;
}

export function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'Auth configuration missing' });
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.userId = payload.sub;
    req.orgId = payload.org_id || null;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function requireCompany(req, res, next) {
  try {
    const requestedCompanyId = req.headers['x-company-id'] || null;
    const companyId = await resolveUserCompany(req.userId, requestedCompanyId);
    if (!companyId) {
      return res.status(403).json({ error: 'User has no authorized company' });
    }
    if (
      requestedCompanyId &&
      requestedCompanyId !== companyId
    ) {
      return res.status(403).json({ error: 'Forbidden company scope' });
    }
    req.companyId = companyId;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to resolve company scope' });
  }
}
