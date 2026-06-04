import express from 'express';
import { verifyAdmin } from '../middleware/auth.js';
import {
  addDockerDomain,
  removeDockerDomain,
  checkDockerDomainStatus,
  getPlatformDnsRecords,
  normalizeDomain,
} from '../domainService.js';
import { getSupabaseServer } from '../lib/supabase-server.js';

const router = express.Router();
const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });

// ==========================================
// POST /add — Link custom domain to Docker/Traefik & DB
// ==========================================
router.post('/add', verifyAdmin, async (req, res) => {
  const { domain, organizationId } = req.body;

  if (!domain || !organizationId) {
    return res.status(400).json({ error: 'Domínio e Organização são obrigatórios' });
  }

  if (req.userRole !== 'superadmin' && organizationId !== req.orgId) {
    return res.status(403).json({ error: 'Voce so pode alterar o dominio da sua propria organizacao.' });
  }

  try {
    const cleanDomain = normalizeDomain(domain);
    const provisioning = await addDockerDomain(cleanDomain);

    // 2. Update DB (Organization)
    const { error: orgError } = await supabase
      .from('organizations')
      .update({ custom_domain: cleanDomain })
      .eq('id', organizationId);

    if (orgError) throw orgError;

    // 3. Add to Domains table for history/tracking
    await supabase.from('domains').upsert({
      organization_id: organizationId,
      domain: cleanDomain,
      is_primary: true,
      status: 'pending',
      dns_records: JSON.stringify(getPlatformDnsRecords(cleanDomain)),
    }, {
      onConflict: 'domain',
    });

    res.json({
      success: true,
      domain: {
        name: cleanDomain,
        status: 'pending',
        verified: false,
        dnsRecords: provisioning.dnsRecords,
      },
      provisioning,
    });
  } catch (error) {
    console.error('Domain Add Route Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// DELETE /remove — Unlink from Docker/Traefik & DB
// ==========================================
router.delete('/remove', verifyAdmin, async (req, res) => {
  const { domain, organizationId } = req.body;

  if (!domain || !organizationId) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  if (req.userRole !== 'superadmin' && organizationId !== req.orgId) {
    return res.status(403).json({ error: 'Voce so pode alterar o dominio da sua propria organizacao.' });
  }

  try {
    const cleanDomain = normalizeDomain(domain);
    await removeDockerDomain(cleanDomain);

    // 2. Clear from DB (Organization)
    await supabase
      .from('organizations')
      .update({ custom_domain: null })
      .eq('id', organizationId);

    // 3. Delete from Domains table
    await supabase.from('domains').delete().eq('domain', cleanDomain);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// GET /verify/:domain — Check DNS A status
// ==========================================
router.get('/verify/:domain', verifyAdmin, async (req, res) => {
  const { domain } = req.params;

  try {
    const status = await checkDockerDomainStatus(domain);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
