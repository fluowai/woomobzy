import { describe, expect, it } from 'vitest';
import { isMasterHostname } from '@/src/lib/tenantBootstrap';

describe('bootstrap multi-tenant', () => {
  it.each(['localhost', '127.0.0.1', '::1'])(
    'mantém o loopback %s no banco principal',
    (hostname) => {
      expect(isMasterHostname(hostname)).toBe(true);
    }
  );

  it.each([
    'imobzy.com.br',
    'painel.imobzy.com.br',
    'imob.wootech.com.br',
    'crm.consultio.com.br',
    'preview.vercel.app',
  ])('reconhece %s como domínio da plataforma', (hostname) => {
    expect(isMasterHostname(hostname)).toBe(true);
  });

  it('mantém domínio personalizado elegível para descoberta BYOB', () => {
    expect(isMasterHostname('imobiliaria-exemplo.com.br')).toBe(false);
  });
});
