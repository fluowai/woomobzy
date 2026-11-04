const MASTER_DOMAIN_SUFFIXES = [
  'imobzy.com.br',
  'wootech.com.br',
  'consultio.com.br',
  'vercel.app',
];

export const isMasterHostname = (hostname: string): boolean => {
  const normalizedHostname = hostname.trim().toLowerCase();

  return (
    normalizedHostname === 'localhost' ||
    normalizedHostname === '127.0.0.1' ||
    normalizedHostname === '::1' ||
    MASTER_DOMAIN_SUFFIXES.some(
      (domain) =>
        normalizedHostname === domain ||
        normalizedHostname.endsWith(`.${domain}`)
    )
  );
};
