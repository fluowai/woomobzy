import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

export function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.userId = payload.sub;
    req.orgId = payload.org_id || null;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireCompany(req, res, next) {
  const companyId = req.headers['x-company-id'] || req.orgId;
  if (!companyId) {
    return res.status(400).json({ error: 'x-company-id header is required' });
  }
  req.companyId = companyId;
  next();
}
