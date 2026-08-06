import dns from 'node:dns/promises';
import tls from 'node:tls';
import { domainToASCII } from 'node:url';
import http from 'node:http';
import { directAdminService } from './directAdminService.js';
import {
  PLATFORM_COMMERCIAL_NAME,
  WHM_MAIN_DOMAIN,
} from './lib/platform-config.js';
import { logger } from './lib/logger.js';

const MAIN_DOMAIN = WHM_MAIN_DOMAIN;
const PLATFORM_PUBLIC_IP =
  process.env.PLATFORM_PUBLIC_IP ||
  process.env.SERVER_PUBLIC_IP ||
  process.env.APP_PUBLIC_IP ||
  process.env.VITE_PLATFORM_IP ||
  '207.58.153.219';
const PLATFORM_PUBLIC_IPS = PLATFORM_PUBLIC_IP.split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

const DNS_HELP_PATH = '/ajuda/dns';
const TRAEFIK_FRONTEND_SERVICE =
  process.env.TRAEFIK_FRONTEND_SERVICE || 'wootech_imob_frontend@docker';
const TRAEFIK_API_SERVICE =
  process.env.TRAEFIK_API_SERVICE || 'wootech_imob_api@docker';
const DOMAIN_RE =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])$/;

function requestDockerAPI(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      socketPath: '/var/run/docker.sock',
      path,
      method,
      headers: {},
    };

    if (body) {
      const jsonBody = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(jsonBody);
      options.bodyData = jsonBody;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : null);
          } catch (e) {
            resolve(data);
          }
        } else {
          const err = new Error(`Docker API Error: ${res.statusCode}`);
          err.statusCode = res.statusCode;
          err.data = data;
          reject(err);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(options.bodyData);
    req.end();
  });
}

export class DomainProvisioningError extends Error {
  constructor(code, message, statusCode = 400, details = {}) {
    super(message);
    this.name = 'DomainProvisioningError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function withTimeout(promise, timeoutMs, timeoutCode) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new DomainProvisioningError(
          timeoutCode,
          'Tempo limite excedido na verificacao do dominio.',
          408
        )
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function normalizeDomain(domainName = '') {
  const raw = String(domainName)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/:\d+$/, '')
    .replace(/\/.*$/, '');

  return domainToASCII(raw.replace(/\.$/, ''));
}

export function assertValidDomain(domainName) {
  const domain = normalizeDomain(domainName);

  if (
    !domain ||
    domain.includes('*') ||
    domain.includes('_') ||
    domain === 'localhost' ||
    domain.endsWith('.localhost') ||
    !DOMAIN_RE.test(domain)
  ) {
    throw new DomainProvisioningError(
      'INVALID_DOMAIN',
      'Dominio invalido. Informe um hostname publico, como www.cliente.com.br.',
      400
    );
  }

  return domain;
}

export function getPlatformDnsRecords(domainName) {
  const normalized = assertValidDomain(domainName);
  const name = normalized.startsWith('www.') ? 'www' : '@';
  const value = PLATFORM_PUBLIC_IPS[0] || PLATFORM_PUBLIC_IP;

  return {
    type: 'A',
    name,
    value,
    ttl: 3600,
    instructions: {
      pt: [
        'Acesse o painel DNS onde o dominio foi registrado.',
        'Crie ou edite um registro do tipo A.',
        `Use o nome ${name} e aponte para ${value}.`,
        'Se quiser usar www, crie outro registro A para www apontando para o mesmo IP ou um CNAME para o dominio principal.',
        'Nao altere registros MX, TXT, mail, smtp, pop ou webmail para nao afetar e-mails.',
        'Salve a alteracao e aguarde a propagacao do DNS.',
        `Depois clique em Verificar DNS no painel da ${PLATFORM_COMMERCIAL_NAME}.`,
      ],
    },
  };
}

export function sanitizeTraefikName(domainName) {
  const domain = assertValidDomain(domainName);
  return domain.replace(/[^a-z0-9-]/g, '_');
}

export function getDomainConfigPath(domainName) {
  const fileName = `imobzy_route_${sanitizeTraefikName(domainName)}`;
  return fileName;
}

async function resolveDomainAddresses(domain) {
  const lookupResults = await withTimeout(
    dns.lookup(domain, { all: true, family: 4 }),
    8000,
    'DNS_LOOKUP_TIMEOUT'
  );

  return [...new Set(lookupResults.map((result) => result.address))];
}

async function checkDnsRecord(domain) {
  try {
    const addresses = await resolveDomainAddresses(domain);
    const verified = addresses.some((address) =>
      PLATFORM_PUBLIC_IPS.includes(address)
    );

    return {
      verified,
      addresses,
      expectedIp: PLATFORM_PUBLIC_IPS[0] || PLATFORM_PUBLIC_IP,
      expectedIps: PLATFORM_PUBLIC_IPS,
    };
  } catch (error) {
    return {
      verified: false,
      addresses: [],
      expectedIp: PLATFORM_PUBLIC_IPS[0] || PLATFORM_PUBLIC_IP,
      expectedIps: PLATFORM_PUBLIC_IPS,
      error: error.code || error.message,
    };
  }
}

export function buildTraefikDomainLabels(domainName) {
  const domain = assertValidDomain(domainName);
  const routerBaseName = sanitizeTraefikName(domain);

  return {
    'traefik.enable': 'true',
    'traefik.docker.network': process.env.TRAEFIK_NETWORK || 'wootech1',
    [`traefik.http.routers.${routerBaseName}_api.rule`]: `Host(\`${domain}\`) && PathPrefix(\`/api\`)`,
    [`traefik.http.routers.${routerBaseName}_api.entryPoints`]: 'websecure',
    [`traefik.http.routers.${routerBaseName}_api.priority`]: '1000',
    [`traefik.http.routers.${routerBaseName}_api.tls.certResolver`]:
      'letsencryptresolver',
    [`traefik.http.routers.${routerBaseName}_api.service`]: TRAEFIK_API_SERVICE,
    [`traefik.http.routers.${routerBaseName}_frontend.rule`]: `Host(\`${domain}\`)`,
    [`traefik.http.routers.${routerBaseName}_frontend.entryPoints`]:
      'websecure',
    [`traefik.http.routers.${routerBaseName}_frontend.priority`]: '100',
    [`traefik.http.routers.${routerBaseName}_frontend.tls.certResolver`]:
      'letsencryptresolver',
    [`traefik.http.routers.${routerBaseName}_frontend.service`]:
      TRAEFIK_FRONTEND_SERVICE,
  };
}

export async function syncPlatformTraefikServices() {
  return { skipped: true, reason: 'DOCKER_API_USED' };
}

async function ensureConfigCanBeWritten(containerName) {
  try {
    const existing = await requestDockerAPI(
      `/containers/${containerName}/json`
    );
    if (existing) {
      if (!existing.Config.Labels['traefik.enable']) {
        throw new DomainProvisioningError(
          'TRAEFIK_CONFIG_CONFLICT',
          'Ja existe um container com este nome nao gerenciado pela WooTech Imob.',
          409
        );
      }
    }
  } catch (error) {
    if (error.statusCode === 404) return;
    throw error;
  }
}

async function writeTraefikDomainConfig(domain) {
  const containerName = getDomainConfigPath(domain);
  const labels = buildTraefikDomainLabels(domain);

  await ensureConfigCanBeWritten(containerName);

  try {
    await requestDockerAPI(`/containers/${containerName}?force=true`, 'DELETE');
  } catch (e) {
    // ignore 404
  }

  const createPayload = {
    Image: 'alpine:latest',
    Cmd: ['sleep', 'infinity'],
    Labels: labels,
    HostConfig: {
      NetworkMode: process.env.TRAEFIK_NETWORK || 'wootech1',
      RestartPolicy: { Name: 'always' },
    },
  };

  try {
    await requestDockerAPI(
      `/containers/create?name=${containerName}`,
      'POST',
      createPayload
    );
  } catch (error) {
    if (
      error.statusCode === 404 &&
      error.data &&
      error.data.includes('No such image')
    ) {
      await requestDockerAPI(`/images/create?fromImage=alpine:latest`, 'POST');
      await requestDockerAPI(
        `/containers/create?name=${containerName}`,
        'POST',
        createPayload
      );
    } else {
      throw error;
    }
  }

  await requestDockerAPI(`/containers/${containerName}/start`, 'POST');

  return containerName;
}

export async function ensureDockerDomainConfig(domainName) {
  const domain = assertValidDomain(domainName);
  const configPath = await writeTraefikDomainConfig(domain);

  return {
    success: true,
    domain,
    configPath,
    dnsRecords: getPlatformDnsRecords(domain),
    routerNames: {
      api: `${sanitizeTraefikName(domain)}_api`,
      frontend: `${sanitizeTraefikName(domain)}_frontend`,
    },
    provisionedBy: 'docker',
  };
}

export async function validateDockerDomainDns(domainName) {
  const domain = assertValidDomain(domainName);
  const dnsStatus = await checkDnsRecord(domain);

  if (!dnsStatus.verified) {
    throw new DomainProvisioningError(
      'DNS_NOT_POINTED',
      `DNS ainda nao aponta para ${dnsStatus.expectedIp}.`,
      422,
      dnsStatus
    );
  }

  return { domain, dnsStatus };
}

export async function addDockerDomain(domainName) {
  const { domain, dnsStatus } = await validateDockerDomainDns(domainName);
  const provisioning = await ensureDockerDomainConfig(domain);

  return {
    ...provisioning,
    dnsStatus,
  };
}

export async function removeDockerDomain(domainName) {
  const domain = assertValidDomain(domainName);
  const configPath = getDomainConfigPath(domain);

  try {
    const existing = await requestDockerAPI(`/containers/${configPath}/json`);
    if (existing && !existing.Config.Labels['traefik.enable']) {
      throw new DomainProvisioningError(
        'TRAEFIK_CONFIG_CONFLICT',
        'A configuracao Traefik deste dominio nao foi gerada pela WooTech Imob.',
        409
      );
    }
    await requestDockerAPI(`/containers/${configPath}?force=true`, 'DELETE');
  } catch (error) {
    if (error.statusCode !== 404) throw error;
  }

  return {
    success: true,
    domain,
    configPath,
    provisionedBy: 'docker',
  };
}

function checkTlsCertificate(domain) {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: domain,
        port: 443,
        servername: domain,
        rejectUnauthorized: false,
      },
      () => {
        const cert = socket.getPeerCertificate();
        const commonName = cert?.subject?.CN || '';
        const valid = socket.authorized === true;

        socket.end();
        resolve({
          valid,
          error: socket.authorizationError || null,
          commonName,
          issuer: cert?.issuer?.CN || '',
          validFrom: cert?.valid_from || null,
          validTo: cert?.valid_to || null,
        });
      }
    );

    socket.setTimeout(8000, () => {
      socket.destroy();
      resolve({
        valid: false,
        error: 'TLS_TIMEOUT',
        commonName: '',
        issuer: '',
        validFrom: null,
        validTo: null,
      });
    });

    socket.on('error', (error) => {
      resolve({
        valid: false,
        error: error.code || error.message,
        commonName: '',
        issuer: '',
        validFrom: null,
        validTo: null,
      });
    });
  });
}

export async function checkDockerDomainStatus(domainName) {
  const domain = assertValidDomain(domainName);
  const dnsRecords = getPlatformDnsRecords(domain);

  try {
    const dnsStatus = await checkDnsRecord(domain);
    const dnsVerified = dnsStatus.verified;
    const ssl = dnsVerified
      ? await checkTlsCertificate(domain)
      : {
          valid: false,
          error: 'DNS_NOT_VERIFIED',
          commonName: '',
          issuer: '',
          validFrom: null,
          validTo: null,
        };
    const verified = dnsVerified && ssl.valid;
    const configPath = getDomainConfigPath(domain);
    let provisioned = false;

    try {
      await requestDockerAPI(`/containers/${configPath}/json`);
      provisioned = true;
    } catch {
      provisioned = false;
    }

    if (dnsVerified && !provisioned) {
      try {
        await ensureDockerDomainConfig(domain);
        provisioned = true;
      } catch (error) {
        console.error(
          `[Traefik] Failed to auto-provision ${domain}:`,
          error.message
        );
      }
    }

    return {
      success: true,
      configured: dnsVerified,
      verified,
      dnsVerified,
      sslVerified: ssl.valid,
      status: verified ? 'verified' : dnsVerified ? 'pending_ssl' : 'pending',
      provisioned,
      expectedIp: dnsStatus.expectedIp,
      expectedIps: dnsStatus.expectedIps,
      addresses: dnsStatus.addresses,
      ssl,
      dnsRecords,
      wikiUrl: DNS_HELP_PATH,
      message: verified
        ? 'DNS e certificado SSL ativos para este dominio.'
        : dnsVerified
          ? `DNS ja aponta para a ${PLATFORM_COMMERCIAL_NAME}, mas o SSL ainda nao esta valido (${ssl.error || 'aguardando certificado'}).`
          : `DNS ainda nao aponta para ${PLATFORM_PUBLIC_IP}.`,
    };
  } catch (error) {
    return {
      success: true,
      configured: false,
      verified: false,
      dnsVerified: false,
      sslVerified: false,
      status: 'pending',
      expectedIp: PLATFORM_PUBLIC_IP,
      expectedIps: PLATFORM_PUBLIC_IPS,
      addresses: [],
      provisioned: false,
      ssl: {
        valid: false,
        error: 'DNS_LOOKUP_FAILED',
        commonName: '',
        issuer: '',
        validFrom: null,
        validTo: null,
      },
      dnsRecords,
      wikiUrl: DNS_HELP_PATH,
      message: `Nao encontramos registro A para ${domain}.`,
      error: error.message,
    };
  }
}

export async function syncRegisteredDockerDomains(supabase, options = {}) {
  const { validateDns = true } = options;
  const domains = new Set();
  const errors = [];

  const addDomain = (value) => {
    if (!value) return;
    try {
      domains.add(assertValidDomain(value));
    } catch (error) {
      errors.push({ domain: value, status: 'invalid', error: error.message });
    }
  };

  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('custom_domain, platform_domain')
    .or('custom_domain.not.is.null,platform_domain.not.is.null');

  if (orgError) throw orgError;
  (orgs || []).forEach((org) => {
    addDomain(org.custom_domain);
    addDomain(org.platform_domain);
  });

  const { data: domainRows, error: domainsError } = await supabase
    .from('domains')
    .select('domain');

  if (!domainsError) {
    (domainRows || []).forEach((row) => addDomain(row.domain));
  }

  const results = [];
  for (const domain of domains) {
    try {
      const provisioning = validateDns
        ? await addDockerDomain(domain)
        : await ensureDockerDomainConfig(domain);
      results.push({
        domain,
        status: 'success',
        configPath: provisioning.configPath,
      });
    } catch (error) {
      results.push({
        domain,
        status: 'skipped',
        code: error.code || 'DOMAIN_SYNC_FAILED',
        error: error.message,
      });
    }
  }

  return {
    success: true,
    processed: results.length,
    results: [...errors, ...results],
  };
}

export async function provisionTenantDomain(subdomain) {
  const normalizedSubdomain = normalizeDomain(subdomain).replace(/\..*$/, '');
  const fullDomain = `${normalizedSubdomain}.${MAIN_DOMAIN}`;
  const dnsProvisioning =
    await directAdminService.addTenantDNS(normalizedSubdomain);

  return {
    subdomain: normalizedSubdomain,
    fullDomain,
    dns: dnsProvisioning,
    success: true,
  };
}

const DOMAIN_PURPOSES = new Set(['site', 'panel', 'both']);

function resolvePurpose(purpose) {
  return DOMAIN_PURPOSES.has(purpose) ? purpose : 'site';
}

/**
 * Vincula um domínio a uma organização (whitelabel/reseller) e o
 * provisiona no Traefik. purpose: 'site' (site público) | 'panel'
 * (painel/sistema) | 'both'. Com strictDns=false, domínios com DNS ainda
 * não apontado são salvos no banco e provisionados no Traefik de qualquer
 * forma (o Traefik só emitirá o certificado SSL quando o DNS apontar).
 */
export async function linkDomainToOrganization(
  supabase,
  { domain, organizationId, purpose, strictDns = true }
) {
  const targetPurpose = resolvePurpose(purpose);
  const cleanDomain = normalizeDomain(domain);

  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id')
    .or(`custom_domain.eq.${cleanDomain},platform_domain.eq.${cleanDomain}`)
    .maybeSingle();

  if (existingOrg && existingOrg.id !== organizationId) {
    throw new DomainProvisioningError(
      'DOMAIN_ALREADY_EXISTS',
      'Este dominio ja esta vinculado a outra organizacao.',
      409
    );
  }

  const { data: existingDomain } = await supabase
    .from('domains')
    .select('organization_id, purpose')
    .eq('domain', cleanDomain)
    .maybeSingle();

  if (existingDomain && existingDomain.organization_id !== organizationId) {
    throw new DomainProvisioningError(
      'DOMAIN_ALREADY_EXISTS',
      'Este dominio ja esta cadastrado na WooTech Imob.',
      409
    );
  }

  const { data: targetOrg } = await supabase
    .from('organizations')
    .select('custom_domain, platform_domain')
    .eq('id', organizationId)
    .maybeSingle();
  const previousCustomDomain = targetOrg?.custom_domain || null;
  const previousPlatformDomain = targetOrg?.platform_domain || null;

  const dnsStatus = await checkDnsRecord(cleanDomain);
  if (strictDns && !dnsStatus.verified) {
    throw new DomainProvisioningError(
      'DNS_NOT_POINTED',
      `DNS ainda nao aponta para ${dnsStatus.expectedIp}.`,
      422,
      dnsStatus
    );
  }

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
      status: dnsStatus.verified ? 'pending_ssl' : 'pending',
      ssl_status: 'pending',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'domain' }
  );

  let provisioning = null;
  try {
    provisioning = await ensureDockerDomainConfig(cleanDomain);
  } catch (provisioningError) {
    logger.error(
      `[Traefik] Failed to provision ${cleanDomain}:`,
      provisioningError.message
    );
  }

  return {
    domain: cleanDomain,
    purpose: mergedPurpose,
    dnsVerified: dnsStatus.verified,
    provisioned: !!provisioning,
    dnsStatus,
    provisioning,
    warning: !dnsStatus.verified
      ? 'Dominio salvo e provisionado no Traefik, mas o DNS ainda nao aponta para a plataforma. Aponte o registro A para que o SSL seja emitido automaticamente.'
      : null,
  };
}

/**
 * Remove um domínio de uma organização e o desprovisiona do Traefik.
 */
export async function unlinkDomainFromOrganization(
  supabase,
  { domain, organizationId, purpose }
) {
  const targetPurpose = DOMAIN_PURPOSES.has(purpose) ? purpose : 'both';
  const cleanDomain = normalizeDomain(domain);

  await removeDockerDomain(cleanDomain);

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
  await supabase.from('domains').delete().eq('domain', cleanDomain);

  return { success: true, domain: cleanDomain };
}
