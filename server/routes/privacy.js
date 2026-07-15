// Fase 7 — Endpoints LGPD (portal do titular)
// Monte com: app.use('/api/privacy', require('./routes/privacy'))
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Middleware simples: exige bearer do Supabase e injeta req.user
async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'invalid_token' });
  req.user = data.user;
  req.supabase = supabase;
  next();
}

function auditCtx(req) {
  return {
    ip: req.headers['x-forwarded-for']?.split(',')[0] || req.ip,
    user_agent: req.headers['user-agent'] || null,
  };
}

// GET /api/privacy/export — exporta dados do titular
router.get('/export', requireAuth, async (req, res) => {
  const uid = req.user.id;
  const s = req.supabase;
  const tables = ['profiles', 'messages', 'consents']; // ajustar conforme schema
  const dump = { exported_at: new Date().toISOString(), user_id: uid, data: {} };
  for (const t of tables) {
    const { data } = await s.from(t).select('*').eq('user_id', uid);
    dump.data[t] = data || [];
  }
  await s.from('data_access_log').insert({
    user_id: uid, actor_id: uid, action: 'export', resource: 'self', ...auditCtx(req),
  });
  res.setHeader('Content-Disposition', `attachment; filename="data-${uid}.json"`);
  res.json(dump);
});

// POST /api/privacy/delete — soft-delete + agenda purga
router.post('/delete', requireAuth, async (req, res) => {
  const uid = req.user.id;
  const s = req.supabase;
  const { confirm } = req.body || {};
  if (confirm !== 'DELETE') return res.status(400).json({ error: 'confirm_required' });
  await s.auth.admin.updateUserById(uid, { user_metadata: { deletion_requested_at: new Date().toISOString() } });
  await s.from('data_access_log').insert({
    user_id: uid, actor_id: uid, action: 'delete_request',
    metadata: { hard_delete_at: new Date(Date.now() + 30*864e5).toISOString() },
    ...auditCtx(req),
  });
  res.json({ ok: true, scheduled_hard_delete_in_days: 30 });
});

// GET /api/privacy/consent — lista consentimentos vigentes
router.get('/consent', requireAuth, async (req, res) => {
  const { data, error } = await req.supabase
    .from('consents').select('*').eq('user_id', req.user.id)
    .order('granted_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ consents: data });
});

// POST /api/privacy/consent — grava/atualiza consentimento
router.post('/consent', requireAuth, async (req, res) => {
  const { purpose, granted } = req.body || {};
  const allowed = ['marketing','analytics','cookies','ai_training'];
  if (!allowed.includes(purpose)) return res.status(400).json({ error: 'invalid_purpose' });
  if (typeof granted !== 'boolean') return res.status(400).json({ error: 'invalid_granted' });
  const ctx = auditCtx(req);
  const { error } = await req.supabase.from('consents').insert({
    user_id: req.user.id, purpose, granted,
    revoked_at: granted ? null : new Date().toISOString(),
    ip: ctx.ip, user_agent: ctx.user_agent,
  });
  if (error) return res.status(500).json({ error: error.message });
  await req.supabase.from('data_access_log').insert({
    user_id: req.user.id, actor_id: req.user.id, action: 'consent_change',
    metadata: { purpose, granted }, ...ctx,
  });
  res.json({ ok: true });
});

export default router;
