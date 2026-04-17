import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifySuperAdmin } from '../middleware/auth.js';
import { addVercelDomain, removeVercelDomain, checkVercelDomainStatus } from '../domainService.js';

const router = express.Router();

const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ [DomainRoutes] Supabase credentials missing.');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

// ==========================================
// POST /add — Link custom domain to Vercel & DB
// ==========================================
router.post('/add', verifySuperAdmin, async (req, res) => {
  const { domain, organizationId } = req.body;

  if (!domain || !organizationId) {
    return res.status(400).json({ error: 'Domínio e Organização são obrigatórios' });
  }

  try {
    // 1. Add to Vercel
    const vercel = await addVercelDomain(domain);
    if (!vercel.success) {
      return res.status(500).json({ error: 'Erro ao adicionar na Vercel', details: vercel.error });
    }

    // 2. Update DB (Organization)
    const { error: orgError } = await supabase
      .from('organizations')
      .update({ custom_domain: domain })
      .eq('id', organizationId);

    if (orgError) throw orgError;

    // 3. Add to Domains table for history/tracking
    await supabase.from('domains').insert({
      organization_id: organizationId,
      domain,
      is_primary: true,
      status: 'active'
    });

    res.json({ success: true, domain, vercel });
  } catch (error) {
    console.error('Domain Add Route Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// DELETE /remove — Unlink from Vercel & DB
// ==========================================
router.delete('/remove', verifySuperAdmin, async (req, res) => {
  const { domain, organizationId } = req.body;

  if (!domain || !organizationId) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  try {
    // 1. Remove from Vercel
    await removeVercelDomain(domain);

    // 2. Clear from DB (Organization)
    await supabase
      .from('organizations')
      .update({ custom_domain: null })
      .eq('id', organizationId);

    // 3. Delete from Domains table
    await supabase.from('domains').delete().eq('domain', domain);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// GET /verify/:domain — Check Vercel Status
// ==========================================
router.get('/verify/:domain', verifySuperAdmin, async (req, res) => {
  const { domain } = req.params;

  try {
    const status = await checkVercelDomainStatus(domain);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
