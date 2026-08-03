import express from 'express';
import { verifyAdmin } from '../middleware/auth.js';
import {
  addDockerDomain,
  DomainProvisioningError,
  removeDockerDomain,
  checkDockerDomainStatus,
  getPlatformDnsRecords,
  normalizeDomain,
  syncRegisteredDockerDomains,
  validateDockerDomainDns,
} from '../domainService.js';
import { getSupabaseServer } from '../lib/supabase-server.js';

const router = express.Router();
const supabase = new Proxy(
  {},
  {
    get: (_, prop) => {
      const client = getSupabaseServer();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

// ==========================================
// POST /add — Link custom domain to Docker/Traefik & DB
// purpose: 'site' (default, site público) | 'panel' (painel/sistema) | 'both'
// ==========================================
router.post('/add', verifyAdmin, async (req, res) => {
  const { domain, organizationId, purpose } = req.body;
  const targetPurpose = ['site', 'panel', 'both'].includes(purpose)
    ? purpose
    : 'site';

  if (!domain || !organizationId) {
    return res
      .status(400)
      .json({ error: 'Domínio e Organização são obrigatórios' });
  }

  if (req.userRole !== 'superadmin' && organizationId !== req.orgId) {
    return res.status(403).json({
      error: 'Voce so pode alterar o dominio da sua propria organizacao.',
    });
  }

  try {
    const cleanDomain = normalizeDomain(domain);
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id, name, custom_domain, platform_domain')
      .or(`custom_domain.eq.${cleanDomain},platform_domain.eq.${cleanDomain}`)
      .maybeSingle();

    if (existingOrg && existingOrg.id !== organizationId) {
      return res.status(409).json({
        error: 'Este dominio ja esta vinculado a outra organizacao.',
        code: 'DOMAIN_ALREADY_EXISTS',
      });
    }

    const { data: existingDomain } = await supabase
      .from('domains')
      .select('organization_id, domain, purpose')
      .eq('domain', cleanDomain)
      .maybeSingle();

    if (existingDomain && existingDomain.organization_id !== organizationId) {
      return res.status(409).json({
        error: 'Este dominio ja esta cadastrado na WooTech Imob.',
        code: 'DOMAIN_ALREADY_EXISTS',
      });
    }

    const { data: targetOrg } = await supabase
      .from('organizations')
      .select('custom_domain, platform_domain')
      .eq('id', organizationId)
      .maybeSingle();
    const previousCustomDomain = targetOrg?.custom_domain || null;
    const previousPlatformDomain = targetOrg?.platform_domain || null;
    const hadExistingDomain = !!existingDomain;

    await validateDockerDomainDns(cleanDomain);

    // 2. Update DB (Organization) — conforme a finalidade
    const orgUpdate = {};
    if (targetPurpose === 'site' || targetPurpose === 'both') {
      orgUpdate.custom_domain = cleanDomain;
    }
    if (targetPurpose === 'panel' || targetPurpose === 'both') {
      orgUpdate.platform_domain = cleanDomain;
    }

    const { error: orgError } = await supabase
      .from('organizations')
      .update(orgUpdate)
      .eq('id', organizationId);

    if (orgError) throw orgError;

    // 3. Add to Domains table for history/tracking
    const mergedPurpose =
      existingDomain?.purpose === 'both' ||
      targetPurpose === 'both' ||
      (existingDomain?.purpose === 'site' && targetPurpose === 'panel') ||
      (existingDomain?.purpose === 'panel' && targetPurpose === 'site')
        ? 'both'
        : targetPurpose;

    await supabase.from('domains').upsert(
      {
        organization_id: organizationId,
        domain: cleanDomain,
        is_custom: true,
        is_primary: true,
        purpose: mergedPurpose,
        status: 'pending_ssl',
        ssl_status: 'pending',
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'domain',
      }
    );

    let provisioning;
    try {
      provisioning = await addDockerDomain(cleanDomain);
    } catch (provisioningError) {
      await supabase
        .from('organizations')
        .update({
          custom_domain: previousCustomDomain,
          platform_domain: previousPlatformDomain,
        })
        .eq('id', organizationId);

      if (hadExistingDomain) {
        await supabase
          .from('domains')
          .update({ status: 'failed' })
          .eq('domain', cleanDomain);
      } else {
        await supabase.from('domains').delete().eq('domain', cleanDomain);
      }

      throw provisioningError;
    }

    res.json({
      success: true,
      purpose: targetPurpose,
      domain: {
        name: cleanDomain,
        purpose: mergedPurpose,
        status: 'pending_ssl',
        verified: false,
        dnsVerified: true,
        sslVerified: false,
        dnsRecords: provisioning.dnsRecords,
        configPath: provisioning.configPath,
        routerNames: provisioning.routerNames,
      },
      provisioning,
    });
  } catch (error) {
    console.error('Domain Add Route Error:', error);
    const status =
      error instanceof DomainProvisioningError ? error.statusCode : 500;
    res.status(status).json({
      error: error.message,
      code: error.code || 'DOMAIN_PROVISIONING_FAILED',
      details: error.details,
    });
  }
});

// ==========================================
// DELETE /remove — Unlink from Docker/Traefik & DB
// ==========================================
router.delete('/remove', verifyAdmin, async (req, res) => {
  const { domain, organizationId, purpose } = req.body;

  if (!domain || !organizationId) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  if (req.userRole !== 'superadmin' && organizationId !== req.orgId) {
    return res.status(403).json({
      error: 'Voce so pode alterar o dominio da sua propria organizacao.',
    });
  }

  try {
    const cleanDomain = normalizeDomain(domain);
    await removeDockerDomain(cleanDomain);

    // 2. Clear from DB (Organization) — só as colunas correspondentes
    const targetPurpose = ['site', 'panel', 'both'].includes(purpose)
      ? purpose
      : 'both';
    const orgUpdate = {};
    if (targetPurpose === 'site' || targetPurpose === 'both') {
      orgUpdate.custom_domain = null;
    }
    if (targetPurpose === 'panel' || targetPurpose === 'both') {
      orgUpdate.platform_domain = null;
    }

    await supabase
      .from('organizations')
      .update(orgUpdate)
      .eq('id', organizationId);

    // 3. Delete from Domains table
    await supabase.from('domains').delete().eq('domain', cleanDomain);

    res.json({ success: true });
  } catch (error) {
    const status =
      error instanceof DomainProvisioningError ? error.statusCode : 500;
    res.status(status).json({
      error: error.message,
      code: error.code || 'DOMAIN_REMOVE_FAILED',
    });
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
    const status =
      error instanceof DomainProvisioningError ? error.statusCode : 500;
    res.status(status).json({
      success: false,
      error: error.message,
      code: error.code || 'DOMAIN_VERIFY_FAILED',
    });
  }
});

// ==========================================
// POST /sync-all — Sync all domains to Traefik
// ==========================================
router.post('/sync-all', verifyAdmin, async (req, res) => {
  if (req.userRole !== 'superadmin') {
    return res.status(403).json({
      error: 'Apenas Super Admins podem sincronizar todos os dominios.',
    });
  }

  try {
    const sync = await syncRegisteredDockerDomains(getSupabaseServer(), {
      validateDns: false,
    });

    res.json({
      success: true,
      message: `Sincronizacao concluida. Processados ${sync.processed} dominios.`,
      results: sync.results,
    });
  } catch (error) {
    console.error('Domain Sync Route Error:', error);
    res.status(500).json({
      error: error.message,
      code: 'DOMAIN_SYNC_FAILED',
    });
  }
});

export default router;
