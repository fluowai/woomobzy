import dns from 'node:dns/promises';
import { directAdminService } from './directAdminService.js';

const MAIN_DOMAIN = process.env.WHM_MAIN_DOMAIN || 'imobfluow.com.br';
const PLATFORM_PUBLIC_IP =
  process.env.PLATFORM_PUBLIC_IP ||
  process.env.SERVER_PUBLIC_IP ||
  process.env.APP_PUBLIC_IP ||
  process.env.VITE_PLATFORM_IP ||
  '';

export function normalizeDomain(domainName = '') {
  return String(domainName)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, 'www.')
    .replace(/\/.*$/, '');
}

export function getPlatformDnsRecords(domainName) {
  const normalized = normalizeDomain(domainName);
  const name = normalized.startsWith('www.') ? 'www' : '@';
  const value = PLATFORM_PUBLIC_IP || 'IP_DO_SERVIDOR';

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
        'Salve a alteracao e aguarde a propagacao do DNS.',
        'Depois clique em Verificar DNS no painel da ImobFluow.',
      ],
    },
  };
}

export async function addDockerDomain(domainName) {
  const domain = normalizeDomain(domainName);

  return {
    success: true,
    domain,
    dnsRecords: getPlatformDnsRecords(domain),
    provisionedBy: 'docker',
  };
}

export async function removeDockerDomain(domainName) {
  return {
    success: true,
    domain: normalizeDomain(domainName),
    provisionedBy: 'docker',
  };
}

export async function checkDockerDomainStatus(domainName) {
  const domain = normalizeDomain(domainName);
  const dnsRecords = getPlatformDnsRecords(domain);

  if (!PLATFORM_PUBLIC_IP) {
    return {
      success: true,
      configured: false,
      verified: false,
      status: 'pending',
      expectedIp: 'IP_DO_SERVIDOR',
      addresses: [],
      dnsRecords,
      error: 'PLATFORM_PUBLIC_IP_NOT_CONFIGURED',
    };
  }

  try {
    const addresses = await dns.resolve4(domain);
    const verified = addresses.includes(PLATFORM_PUBLIC_IP);

    return {
      success: true,
      configured: verified,
      verified,
      status: verified ? 'verified' : 'pending',
      expectedIp: PLATFORM_PUBLIC_IP,
      addresses,
      dnsRecords,
    };
  } catch (error) {
    return {
      success: true,
      configured: false,
      verified: false,
      status: 'pending',
      expectedIp: PLATFORM_PUBLIC_IP,
      addresses: [],
      dnsRecords,
      error: error.message,
    };
  }
}

export async function provisionTenantDomain(subdomain) {
  const normalizedSubdomain = normalizeDomain(subdomain).replace(/\..*$/, '');
  const fullDomain = `${normalizedSubdomain}.${MAIN_DOMAIN}`;
  const dnsProvisioning = await directAdminService.addTenantDNS(normalizedSubdomain);

  return {
    subdomain: normalizedSubdomain,
    fullDomain,
    dns: dnsProvisioning,
    success: true,
  };
}
