import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { callApi } from '@/src/lib/api';
import { supabase } from '../../services/supabase';
import {
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  Building2,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { PLATFORM_IP } from '../../utils/platform';

interface Reseller {
  id: string;
  name: string;
  slug?: string;
  status: string;
  custom_domain?: string | null;
  platform_domain?: string | null;
}

interface DomainMeta {
  purpose: string;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'DNS pendente',
  pending_ssl: 'DNS OK · SSL pendente',
  active: 'Ativo',
  error: 'Erro',
};

const PURPOSE_LABELS: Record<string, string> = {
  site: 'Site',
  panel: 'Painel',
  both: 'Site + Painel',
};

const ResellerDomains: React.FC = () => {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [domainMeta, setDomainMeta] = useState<Record<string, DomainMeta>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResellerId, setSelectedResellerId] = useState('');
  const [purpose, setPurpose] = useState('site');
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);

  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<string, any>>({});
  const [removing, setRemoving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await callApi('/api/mega/resellers');
      const resellersList: Reseller[] = data.resellers || [];
      setResellers(resellersList);
      setErrorMsg(null);

      const ids = resellersList.map((r) => r.id);
      if (ids.length > 0) {
        const { data: rows, error } = await supabase
          .from('domains')
          .select('domain, organization_id, purpose, status')
          .in('organization_id', ids);
        if (error) throw error;
        const meta: Record<string, DomainMeta> = {};
        (rows || []).forEach((row) => {
          meta[row.domain] = {
            purpose: row.purpose,
            status: row.status,
          };
        });
        setDomainMeta(meta);
      } else {
        setDomainMeta({});
      }
    } catch (error: any) {
      logger.error('Error fetching resellers/domains:', error);
      setErrorMsg(error.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain || !selectedResellerId) return;
    if (!newDomain.includes('.')) {
      alert('Por favor insira um domínio válido (ex: imobiliaria.com.br)');
      return;
    }

    setAdding(true);
    try {
      const result = await callApi(
        `/api/mega/resellers/${selectedResellerId}/domain`,
        {
          method: 'POST',
          body: JSON.stringify({
            domain: newDomain.toLowerCase().trim(),
            purpose,
            strictDns: false,
          }),
        }
      );

      if (result.dnsVerified) {
        alert(`Domínio ${result.domain} vinculado e provisionado no Traefik!`);
      } else {
        alert(
          `Domínio ${result.domain} salvo. Aponte o registro A para ${PLATFORM_IP} e clique em Verificar DNS.`
        );
      }

      setNewDomain('');
      setSelectedResellerId('');
      setPurpose('site');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      logger.error('Error linking domain:', error);
      alert(`Erro ao vincular: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setAdding(false);
    }
  };

  const handleVerify = async (domain: string) => {
    setVerifying(domain);
    try {
      const result = await callApi(`/api/domains/verify/${domain}`);
      setVerifyResults((current) => ({ ...current, [domain]: result }));
      if (result.verified) {
        alert(`OK: ${domain} — DNS configurado corretamente.`);
      } else {
        alert(
          `${domain}: DNS pendente ou incorreto.\nAponte o registro A para ${PLATFORM_IP} e clique em Verificar DNS novamente.`
        );
      }
    } catch (error: any) {
      alert(`Erro ao verificar: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setVerifying(null);
    }
  };

  const handleRemove = async (
    resellerId: string,
    domain: string,
    removePurpose: string
  ) => {
    if (
      !confirm(
        `Remover o domínio ${domain}? O whitelabel perderá este vínculo e o site/painel sairá do ar.`
      )
    )
      return;

    setRemoving(domain);
    try {
      await callApi(`/api/mega/resellers/${resellerId}/domain`, {
        method: 'DELETE',
        body: JSON.stringify({ domain, purpose: removePurpose }),
      });
      setVerifyResults((current) => {
        const next = { ...current };
        delete next[domain];
        return next;
      });
      fetchData();
    } catch (error: any) {
      alert(`Erro ao remover: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setRemoving(null);
    }
  };

  const handleSyncAll = async () => {
    if (
      !confirm(
        'Sincronizar todos os domínios com o Traefik? Isso recria os arquivos de configuração para todos os domínios cadastrados.'
      )
    )
      return;

    setSyncing(true);
    try {
      const response = await callApi('/api/domains/sync-all', {
        method: 'POST',
      });
      alert(response.message || 'Sincronização concluída.');
      fetchData();
    } catch (error: any) {
      alert(`Erro na sincronização: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSyncing(false);
    }
  };

  const renderDomainCell = (
    reseller: Reseller,
    domain: string | null | undefined,
    columnPurpose: string
  ) => {
    if (!domain) {
      return <span className="text-gray-400 text-sm">—</span>;
    }

    const meta = domainMeta[domain];
    const verifyResult = verifyResults[domain];
    const removePurpose = meta?.purpose === 'both' ? 'both' : columnPurpose;

    return (
      <div className="flex flex-col gap-1.5 items-start">
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 hover:underline text-sm font-medium"
          >
            {domain}
          </a>
          {meta && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold uppercase tracking-tight">
              {meta.purpose === 'both'
                ? 'Site + Painel'
                : PURPOSE_LABELS[columnPurpose]}
            </span>
          )}
        </div>
        {meta && (
          <span
            className={`text-[11px] font-medium ${
              meta.status === 'active' || meta.status === 'pending_ssl'
                ? 'text-green-600'
                : 'text-amber-600'
            }`}
          >
            {STATUS_LABELS[meta.status] || meta.status}
          </span>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleVerify(domain)}
            disabled={verifying === domain}
            className="text-xs flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 hover:bg-white transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={12}
              className={verifying === domain ? 'animate-spin' : ''}
            />
            Verificar DNS
          </button>
          <button
            onClick={() => handleRemove(reseller.id, domain, removePurpose)}
            disabled={removing === domain}
            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Remover vínculo"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {verifyResult && (
          <span
            className={`text-[11px] flex items-center gap-1 ${
              verifyResult.verified ? 'text-green-600' : 'text-amber-600'
            }`}
          >
            {verifyResult.verified ? (
              <CheckCircle size={12} />
            ) : (
              <AlertCircle size={12} />
            )}
            {verifyResult.verified
              ? 'DNS OK'
              : `DNS pendente (esperado ${verifyResult.expectedIp}, encontrado ${
                  verifyResult.addresses?.length
                    ? verifyResult.addresses.join(', ')
                    : 'nenhum A'
                })`}
          </span>
        )}
      </div>
    );
  };

  return (
    <div>
      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 border border-red-200">
          <strong>Erro ao carregar:</strong> {errorMsg}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Globe className="text-purple-600" />
            Domínios dos Whitelabels
          </h1>
          <p className="text-gray-500 mt-1">
            Vincule os domínios de site público e de painel de cada whitelabel e
            acompanhe o provisionamento no Traefik.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-60"
            title="Sincronizar domínios com o Traefik"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            Sync Traefik
          </button>
          <button
            onClick={fetchData}
            disabled={syncing}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-60"
            title="Atualizar"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            <Plus size={20} /> Vincular Domínio
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Whitelabel
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Domínio do Site
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Domínio do Painel
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : resellers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  Nenhum whitelabel encontrado.
                </td>
              </tr>
            ) : (
              resellers.map((reseller) => (
                <tr
                  key={reseller.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap align-top">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {reseller.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {reseller.slug || '-'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    {renderDomainCell(reseller, reseller.custom_domain, 'site')}
                  </td>
                  <td className="px-6 py-4 align-top">
                    {renderDomainCell(
                      reseller,
                      reseller.platform_domain,
                      'panel'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Vincular Domínio */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                Vincular Domínio
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Whitelabel *
                </label>
                <select
                  value={selectedResellerId}
                  onChange={(e) => setSelectedResellerId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                >
                  <option value="">Selecione um whitelabel...</option>
                  {resellers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Domínio *
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                >
                  <option value="site">Site Público (www)</option>
                  <option value="panel">Painel / Sistema</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domínio *
                </label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value.toLowerCase())}
                  placeholder="ex: www.imobiliaria.com.br"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <p>
                  Aponte o registro A para <strong>{PLATFORM_IP}</strong>. O
                  domínio é salvo mesmo com DNS pendente e é provisionado
                  automaticamente assim que o DNS apontar.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adding || !newDomain || !selectedResellerId}
                  className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-60"
                >
                  <Plus size={18} />
                  {adding ? 'Vinculando...' : 'Vincular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResellerDomains;
