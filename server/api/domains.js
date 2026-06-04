import {
  addDockerDomain,
  checkDockerDomainStatus,
  getPlatformDnsRecords,
  normalizeDomain,
  removeDockerDomain,
} from '../domainService.js';
import { getSupabaseServer } from '../lib/supabase-server.js';

const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });

export const addDomain = async (req, res) => {
  const { domain, organizationId } = req.body;

  if (!domain || !organizationId) {
    return res.status(400).json({ error: 'Domain and Organization ID are required' });
  }

  try {
    const cleanDomain = normalizeDomain(domain);
    const provisioning = await addDockerDomain(cleanDomain);

    const { error: updateError } = await supabase
      .from('organizations')
      .update({ custom_domain: cleanDomain })
      .eq('id', organizationId);

    if (updateError) throw updateError;

    res.json({
      success: true,
      domain: {
        name: cleanDomain,
        status: 'pending',
        verified: false,
        dnsRecords: provisioning.dnsRecords,
        provisioned: true,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const verifyDomain = async (req, res) => {
  try {
    res.json(await checkDockerDomainStatus(req.params.domain));
  } catch (error) {
    res.status(400).json({ error: error.message });
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
    res.status(400).json({ error: error.message });
  }
};

export const getDomainDnsRecords = (domain) => getPlatformDnsRecords(domain);

export const waitForDomainVerification = async (domain) => {
  const status = await checkDockerDomainStatus(domain);
  return { success: status.verified, verified: status.verified, attempt: 1 };
};
