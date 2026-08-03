import {
  addDockerDomain,
  checkDockerDomainStatus,
  DomainProvisioningError,
  getPlatformDnsRecords,
  normalizeDomain,
  removeDockerDomain,
  validateDockerDomainDns,
} from '../domainService.js';
import { getSupabaseServer } from '../lib/supabase-server.js';

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

export const addDomain = async (req, res) => {
  const { domain, organizationId, purpose } = req.body;
  const targetPurpose = ['site', 'panel', 'both'].includes(purpose)
    ? purpose
    : 'site';

  if (!domain || !organizationId) {
    return res
      .status(400)
      .json({ error: 'Domain and Organization ID are required' });
  }

  try {
    const cleanDomain = normalizeDomain(domain);
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .or(`custom_domain.eq.${cleanDomain},platform_domain.eq.${cleanDomain}`)
      .maybeSingle();

    if (existingOrg && existingOrg.id !== organizationId) {
      return res.status(409).json({
        error: 'Este dominio ja esta vinculado a outra organizacao.',
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

    await validateDockerDomainDns(cleanDomain);

    const orgUpdate = {};
    if (targetPurpose === 'site' || targetPurpose === 'both') {
      orgUpdate.custom_domain = cleanDomain;
    }
    if (targetPurpose === 'panel' || targetPurpose === 'both') {
      orgUpdate.platform_domain = cleanDomain;
    }

    const { error: updateError } = await supabase
      .from('organizations')
      .update(orgUpdate)
      .eq('id', organizationId);

    if (updateError) throw updateError;

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

      throw provisioningError;
    }

    res.json({
      success: true,
      purpose: targetPurpose,
      domain: {
        name: cleanDomain,
        purpose: targetPurpose,
        status: 'pending_ssl',
        verified: false,
        dnsVerified: true,
        sslVerified: false,
        dnsRecords: provisioning.dnsRecords,
        configPath: provisioning.configPath,
        routerNames: provisioning.routerNames,
        provisioned: true,
      },
    });
  } catch (error) {
    const status =
      error instanceof DomainProvisioningError ? error.statusCode : 400;
    res.status(status).json({
      error: error.message,
      code: error.code || 'DOMAIN_PROVISIONING_FAILED',
      details: error.details,
    });
  }
};

export const verifyDomain = async (req, res) => {
  try {
    res.json(await checkDockerDomainStatus(req.params.domain));
  } catch (error) {
    const status =
      error instanceof DomainProvisioningError ? error.statusCode : 400;
    res.status(status).json({
      success: false,
      error: error.message,
      code: error.code || 'DOMAIN_VERIFY_FAILED',
    });
  }
};

export const removeDomain = async (req, res) => {
  const { domain, organizationId } = req.body;

  try {
    const cleanDomain = normalizeDomain(domain);
    await removeDockerDomain(cleanDomain);

    if (organizationId) {
      await supabase
        .from('organizations')
        .update({ custom_domain: null })
        .eq('id', organizationId);
    }

    res.json({ success: true, message: 'Dominio removido com sucesso' });
  } catch (error) {
    const status =
      error instanceof DomainProvisioningError ? error.statusCode : 400;
    res.status(status).json({
      error: error.message,
      code: error.code || 'DOMAIN_REMOVE_FAILED',
    });
  }
};

export const getDomainDnsRecords = (domain) => getPlatformDnsRecords(domain);

export const waitForDomainVerification = async (domain) => {
  const status = await checkDockerDomainStatus(domain);
  return { success: status.verified, verified: status.verified, attempt: 1 };
};
