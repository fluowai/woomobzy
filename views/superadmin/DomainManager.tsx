import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { callApi } from '../../src/lib/api';
import { PLATFORM_IP } from '../../utils/platform';

// Real Domain Interface
interface DomainEntry {
  organization_id: string;
  organization_name: string;
  domain: string;
  verified: boolean; // We might need to check this on the fly or store it
  dns_configured: boolean;
  expectedIp?: string;
  addresses?: string[];
  wikiUrl?: string;
  message?: string;
}

interface Organization {
  id: string;
  name: string;
  custom_domain?: string;
}

const DomainManager: React.FC = () => {
  const [domains, setDomains] = useState<DomainEntry[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Form State
  const [newDomain, setNewDomain] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Organizations
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('id, name, custom_domain')
        .order('name');

      if (error) throw error;

      setOrganizations(orgs || []);

      // 2. Filter domains
      const activeDomains: DomainEntry[] = (orgs || [])
        .filter((org) => org.custom_domain)
        .map((org) => ({
          organization_id: org.id,
          organization_name: org.name,
          domain: org.custom_domain!,
          verified: false, // Default to false until checked? Or we could fetch status
          dns_configured: false,
        }));

      setDomains(activeDomains);

      // Optional: verify all? might be slow. Let's verify on demand or showing "Check Status"
    } catch (e) {
      logger.error('Error fetching data:', e);
      alert('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain || !selectedOrgId) return;

    // Validation
    if (!newDomain.includes('.')) {
      alert('Por favor insira um domínio válido (ex: cliente.com.br)');
      return;
    }

    setAdding(true);

    try {
      // Call Backend API
      await callApi('/api/domains/add', {
        method: 'POST',
        body: JSON.stringify({
          domain: newDomain.toLowerCase().trim(),
          organizationId: selectedOrgId,
        }),
      });

      alert(`Dominio ${newDomain} salvo. Oriente o cliente a apontar o registro A para ${PLATFORM_IP}.`);
      setNewDomain('');
      setSelectedOrgId('');

      // Refresh List
      fetchData();
    } catch (e: any) {
      logger.error('Add Error:', e);
      alert(`Erro ao adicionar: ${e.message}`);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (domain: string, orgId: string) => {
    if (
      !confirm(`Remover o domínio ${domain}? O site deste cliente sairá do ar.`)
    )
      return;

    try {
      await callApi('/api/domains/remove', {
        method: 'DELETE',
        body: JSON.stringify({ domain, organizationId: orgId }),
      });

      fetchData(); // Refresh
    } catch (e: any) {
      alert(`Erro ao remover: ${e.message}`);
    }
  };

  const verifyStatus = async (domain: string) => {
    setVerifying(domain);
    try {
      const data = await callApi(`/api/domains/verify/${domain}`);
      setDomains((current) =>
        current.map((item) =>
          item.domain === domain
            ? {
                ...item,
                verified: Boolean(data.verified),
                dns_configured: Boolean(data.verified),
                expectedIp: data.expectedIp,
                addresses: data.addresses || [],
                wikiUrl: data.wikiUrl,
                message: data.message,
              }
            : item
        )
      );

      if (data.verified) {
        alert(`✅ ${domain}: DNS Configurado Corretamente!`);
      } else {
        alert(
          `${domain}: DNS pendente ou incorreto.\nVerifique se o registro A aponta para ${PLATFORM_IP}.`
        );
      }
    } catch (e) {
      alert('Erro ao verificar status.');
    } finally {
      setVerifying(null);
    }
  };

  const [syncing, setSyncing] = useState(false);

  const handleSyncAll = async () => {
    if (!confirm('Deseja sincronizar todos os domínios com o Traefik? Isso irá recriar os arquivos de configuração para todos os domínios cadastrados.')) return;
    setSyncing(true);
    try {
      const response = await callApi('/api/domains/sync-all', { method: 'POST' });
      alert(response.message);
      fetchData();
    } catch (e: any) {
      alert(`Erro na sincronização: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Globe className="text-indigo-600" />
            Gerenciamento de Domínios (Super Admin)
          </h1>
          <p className="text-gray-500 mt-1">
            Gerencie os domínios personalizados de todos os clientes.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            title="Recria as rotas do Traefik para todos os domínios"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando...' : 'Sincronizar Traefik (Geral)'}
          </button>
          <button
            onClick={fetchData}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            title="Atualizar Lista"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Add Domain Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
          <Plus size={20} className="text-indigo-600" /> Novo Domínio
        </h2>
        <form
          onSubmit={handleAddDomain}
          className="flex gap-4 items-end flex-wrap"
        >
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organização (Cliente)
            </label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="">Selecione um cliente...</option>
              {organizations.map((org) => (
                <option
                  key={org.id}
                  value={org.id}
                  disabled={!!org.custom_domain}
                >
                  {org.name}{' '}
                  {org.custom_domain
                    ? `(Já possui domínio: ${org.custom_domain})`
                    : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Domínio Personalizado
            </label>
            <input
              type="text"
              placeholder="ex: www.imobiliaria.com.br"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value.toLowerCase())}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !newDomain || !selectedOrgId}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 h-[42px]"
          >
            {adding ? (
              'Processando...'
            ) : (
              <>
                <Plus size={20} /> Salvar dominio
              </>
            )}
          </button>
        </form>
        <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <p>
            <strong>Nota:</strong> Cada organização pode ter apenas 1 domínio
            personalizado. O sistema atualizará automaticamente o banco de dados
            e o registro A deve apontar para <strong>{PLATFORM_IP}</strong>.
          </p>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Domínio
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  Caregando domínios...
                </td>
              </tr>
            ) : domains.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  Nenhum domínio configurado.
                </td>
              </tr>
            ) : (
              domains.map((domain) => (
                <tr key={domain.organization_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {domain.organization_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a
                      href={`https://${domain.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      {domain.domain}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => verifyStatus(domain.domain)}
                      className="text-xs flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 hover:bg-white transition-colors"
                    >
                      {verifying === domain.domain ? (
                        <span className="animate-spin">⌛</span>
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      Verificar DNS
                    </button>
                    {domain.expectedIp && (
                      <div className="mt-2 text-[11px] leading-relaxed text-gray-500">
                        <div>Esperado: <span className="font-mono">{domain.expectedIp}</span></div>
                        <div>Encontrado: <span className="font-mono">{domain.addresses?.length ? domain.addresses.join(', ') : 'nenhum A'}</span></div>
                        {!domain.verified && domain.wikiUrl && (
                          <a href={domain.wikiUrl} target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">
                            Ver wiki DNS
                          </a>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() =>
                        handleDelete(domain.domain, domain.organization_id)
                      }
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Desconectar e Remover"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DomainManager;

