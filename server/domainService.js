import dns from 'node:dns/promises';
import { directAdminService } from './directAdminService.js';

const MAIN_DOMAIN = process.env.WHM_MAIN_DOMAIN || 'imobfluow.com.br';
const PLATFORM_PUBLIC_IP =
  process.env.PLATFORM_PUBLIC_IP ||
  process.env.SERVER_PUBLIC_IP ||
  process.env.APP_PUBLIC_IP ||
  process.env.VITE_PLATFORM_IP ||
  '207.58.153.219';
const DNS_HELP_PATH = '/ajuda/dns';

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
  const value = PLATFORM_PUBLIC_IP;

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
      wikiUrl: DNS_HELP_PATH,
      message: verified
        ? 'DNS apontando corretamente para a ImobFluow.'
        : `DNS ainda nao aponta para ${PLATFORM_PUBLIC_IP}.`,
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
      wikiUrl: DNS_HELP_PATH,
      message: `Nao encontramos registro A para ${domain}.`,
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
