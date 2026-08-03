import { logger } from '@/utils/logger';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { callApi } from '@/src/lib/api';
import {
  Copy,
  Key,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Eye,
} from 'lucide-react';

interface LicenseSummary {
  id: string;
  organization_id: string;
  organization_name?: string | null;
  organization_slug?: string | null;
  license_key: string;
  plan_id?: string | null;
  plan_name?: string | null;
  status: string;
  edition: string;
  max_installations: number;
  grace_days: number;
  blocking_policy: string;
  issued_at?: string | null;
  activated_at?: string | null;
  expires_at?: string | null;
  last_validated_at?: string | null;
  active_installations?: number;
  total_installations?: number;
  last_heartbeat_at?: string | null;
  created_at: string;
}

interface OrganizationOption {
  id: string;
  name: string;
}

const STATUS_META: Record<string, { label: string; classes: string }> = {
  draft: { label: 'Rascunho', classes: 'bg-gray-100 text-gray-700' },
  active: { label: 'Ativa', classes: 'bg-green-100 text-green-800' },
  suspended: { label: 'Suspensa', classes: 'bg-amber-100 text-amber-800' },
  expired: { label: 'Expirada', classes: 'bg-orange-100 text-orange-800' },
  revoked: { label: 'Revogada', classes: 'bg-red-100 text-red-800' },
  blocked: { label: 'Bloqueada', classes: 'bg-slate-800 text-white' },
};

const EDITION_LABELS: Record<string, string> = {
  standard: 'Standard',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const initialForm = {
  organization_id: '',
  plan_id: '',
  edition: 'standard',
  max_installations: '1',
  grace_days: '3',
  blocking_policy: 'soft',
  status: 'draft',
  expires_at: '',
  metadata: '',
};

const Licenses: React.FC = () => {
  const navigate = useNavigate();
  const [licenses, setLicenses] = useState<LicenseSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editionFilter, setEditionFilter] = useState('');

  const [orgs, setOrgs] = useState<OrganizationOption[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [newLicenseKey, setNewLicenseKey] = useState<string | null>(null);

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (editionFilter) params.set('edition', editionFilter);
      const query = params.toString();
      const data = await callApi(`/api/mega/licenses${query ? `?${query}` : ''}`);
      setLicenses(data.licenses || []);
      setTotal(data.total || 0);
      setErrorMsg(null);
    } catch (error) {
      logger.error('Error fetching licenses:', error);
      setErrorMsg((error as Error)?.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, editionFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLicenses();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    Promise.all([
      callApi('/api/mega/resellers').catch(() => ({ resellers: [] })),
      callApi('/api/mega/direct-clients').catch(() => ({ clients: [] })),
    ])
      .then(([resellersData, clientsData]) => {
        const resellers = (resellersData.resellers || []) as OrganizationOption[];
        const clients = (clientsData.clients || []) as OrganizationOption[];
        const merged: OrganizationOption[] = [];
        const seen = new Set<string>();
        for (const org of [...resellers, ...clients]) {
          if (org?.id && !seen.has(org.id)) {
            seen.add(org.id);
            merged.push(org);
          }
        }
        setOrgs(merged);
      })
      .catch((error) => logger.error('Error fetching organizations:', error));
  }, []);

  const filtered = useMemo(
    () =>
      licenses.filter(
        (license) =>
          !search ||
          license.organization_name
            ?.toLowerCase()
            .includes(search.toLowerCase()) ||
          license.license_key.toLowerCase().includes(search.toLowerCase())
      ),
    [licenses, search]
  );

  const handleOpenModal = () => {
    setFormData(initialForm);
    setNewLicenseKey(null);
    setIsModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload: Record<string, unknown> = {
        organization_id: formData.organization_id,
        plan_id: formData.plan_id || null,
        edition: formData.edition,
        max_installations: Number(formData.max_installations),
        grace_days: Number(formData.grace_days),
        blocking_policy: formData.blocking_policy,
        status: formData.status,
        expires_at: formData.expires_at
          ? new Date(formData.expires_at).toISOString()
          : null,
      };
      if (formData.metadata.trim()) {
        try {
          payload.metadata = JSON.parse(formData.metadata);
        } catch {
          alert('Metadata inválida: informe JSON válido ou deixe vazio.');
          setFormLoading(false);
          return;
        }
      }
      const response = await callApi('/api/mega/licenses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setNewLicenseKey(response.licenseKey || '');
      await fetchLicenses();
    } catch (error) {
      alert(`Erro ao criar licença: ${(error as Error)?.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const runStatusAction = async (
    license: LicenseSummary,
    action: string,
    confirmMessage: string
  ) => {
    if (!window.confirm(confirmMessage)) return;
    try {
      await callApi(`/api/mega/licenses/${license.id}/${action}`, {
        method: 'POST',
      });
      await fetchLicenses();
    } catch (error) {
      alert(`Erro: ${(error as Error)?.message}`);
    }
  };

  const handleReissueKey = async (license: LicenseSummary) => {
    if (
      !window.confirm(
        'Reemitir a chave invalida qualquer instalação que use a chave antiga. Continuar?'
      )
    )
      return;
    try {
      const response = await callApi(`/api/mega/licenses/${license.id}/reissue-key`, {
        method: 'POST',
      });
      window.alert(`Nova chave de licença:\n\n${response.licenseKey}`);
      await fetchLicenses();
    } catch (error) {
      alert(`Erro ao reemitir chave: ${(error as Error)?.message}`);
    }
  };

  const copyKey = (value: string) => {
    navigator.clipboard?.writeText(value).catch(() => undefined);
  };

  const renderActions = (license: LicenseSummary) => {
    const buttons: Array<{
      label: string;
      action: string;
      confirm: string;
      className: string;
    }> = [];
    if (license.status === 'draft') {
      buttons.push({
        label: 'Ativar',
        action: 'activate',
        confirm: 'Ativar esta licença?',
        className: 'text-green-600 hover:bg-green-50',
      });
      buttons.push({
        label: 'Revogar',
        action: 'revoke',
        confirm: 'Revogar esta licença?',
        className: 'text-red-600 hover:bg-red-50',
      });
      buttons.push({
        label: 'Bloquear',
        action: 'block',
        confirm: 'Bloquear (hard) esta licença?',
        className: 'text-slate-700 hover:bg-slate-100',
      });
    } else if (license.status === 'active') {
      buttons.push({
        label: 'Suspender',
        action: 'suspend',
        confirm: 'Suspender esta licença?',
        className: 'text-amber-600 hover:bg-amber-50',
      });
      buttons.push({
        label: 'Revogar',
        action: 'revoke',
        confirm: 'Revogar esta licença?',
        className: 'text-red-600 hover:bg-red-50',
      });
      buttons.push({
        label: 'Bloquear',
        action: 'block',
        confirm: 'Bloquear (hard) esta licença?',
        className: 'text-slate-700 hover:bg-slate-100',
      });
    } else if (license.status === 'suspended' || license.status === 'expired') {
      buttons.push({
        label: 'Ativar',
        action: 'activate',
        confirm: 'Reativar esta licença?',
        className: 'text-green-600 hover:bg-green-50',
      });
      buttons.push({
        label: 'Bloquear',
        action: 'block',
        confirm: 'Bloquear (hard) esta licença?',
        className: 'text-slate-700 hover:bg-slate-100',
      });
    } else if (license.status === 'blocked') {
      buttons.push({
        label: 'Desbloquear',
        action: 'unblock',
        confirm: 'Desbloquear esta licença?',
        className: 'text-green-600 hover:bg-green-50',
      });
    }

    return buttons.map((button) => (
      <button
        key={button.action}
        onClick={() =>
          runStatusAction(license, button.action, button.confirm)
        }
        className={`p-1.5 rounded hover:bg-gray-100 mr-1 ${button.className}`}
        title={button.label}
      >
        {button.label}
      </button>
    ));
  };

  return (
    <div>
      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 border border-red-200">
          <strong>Erro ao carregar:</strong> {errorMsg}
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Licenças</h1>
          <p className="text-gray-500">
            Central de Licenciamento Wootech — {total} licença(s)
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por organização ou chave..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none w-72"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select
            value={editionFilter}
            onChange={(e) => setEditionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="">Todas as edições</option>
            <option value="standard">Standard</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            <Plus size={20} /> Nova Licença
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Organização
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Chave
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Plano / Edição
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Instalações
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Expira em
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Último heartbeat
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma licença encontrada.
                </td>
              </tr>
            ) : (
              filtered.map((license) => {
                const status = STATUS_META[license.status] || STATUS_META.draft;
                return (
                  <tr
                    key={license.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                          <Key size={20} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {license.organization_name || license.organization_id}
                          </div>
                          <div className="text-xs text-gray-400">
                            {license.organization_slug || license.organization_id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="inline-flex items-center gap-2 bg-gray-100 px-2 py-1 rounded text-xs text-purple-600 max-w-[220px] truncate">
                        <span className="truncate">{license.license_key}</span>
                        <button
                          onClick={() => copyKey(license.license_key)}
                          className="text-gray-400 hover:text-purple-600"
                          title="Copiar chave"
                        >
                          <Copy size={12} />
                        </button>
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="font-medium text-gray-900">
                        {license.plan_name || 'Sem plano'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {EDITION_LABELS[license.edition] || license.edition}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.classes}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="font-bold text-gray-900">
                        {license.active_installations ?? 0}
                      </span>
                      <span className="text-gray-400">
                        {' '}
                        / {license.total_installations ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {license.expires_at
                        ? new Date(license.expires_at).toLocaleDateString('pt-BR')
                        : 'Sem prazo'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {license.last_heartbeat_at
                        ? new Date(license.last_heartbeat_at).toLocaleString('pt-BR')
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => navigate(`/megaadmin/licenses/${license.id}`)}
                        className="p-1.5 rounded hover:bg-gray-100 mr-1 text-purple-600"
                        title="Ver detalhes"
                      >
                        <Eye size={16} />
                      </button>
                      {license.status === 'active' ||
                      license.status === 'suspended' ? (
                        <button
                          onClick={() => handleReissueKey(license)}
                          className="p-1.5 rounded hover:bg-gray-100 mr-1 text-blue-600"
                          title="Reemitir chave"
                        >
                          <RefreshCw size={16} />
                        </button>
                      ) : null}
                      {renderActions(license)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Nova Licença</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {newLicenseKey ? (
              <div className="p-6">
                <p className="text-green-700 font-medium mb-2">
                  Licença criada com sucesso!
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  Copie a chave e configure no ambiente da instalação
                  (LICENSE_KEY):
                </p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <code className="text-xs text-purple-700 break-all flex-1">
                    {newLicenseKey}
                  </code>
                  <button
                    onClick={() => copyKey(newLicenseKey)}
                    className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    title="Copiar chave"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organização *
                  </label>
                  <select
                    required
                    value={formData.organization_id}
                    onChange={(e) =>
                      setFormData({ ...formData, organization_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">Selecione a organização...</option>
                    {orgs.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Edição
                    </label>
                    <select
                      value={formData.edition}
                      onChange={(e) =>
                        setFormData({ ...formData, edition: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="standard">Standard</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="draft">Rascunho</option>
                      <option value="active">Ativa</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Máx. instalações
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.max_installations}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_installations: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dias de tolerância
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.grace_days}
                      onChange={(e) =>
                        setFormData({ ...formData, grace_days: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Política de bloqueio
                    </label>
                    <select
                      value={formData.blocking_policy}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          blocking_policy: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="soft">Soft</option>
                      <option value="hard">Hard</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expira em
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.expires_at}
                      onChange={(e) =>
                        setFormData({ ...formData, expires_at: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plano (UUID — opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="ex.: 22222222-2222-4222-8222-222222222222"
                    value={formData.plan_id}
                    onChange={(e) =>
                      setFormData({ ...formData, plan_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metadata (JSON — opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder='{"contrato":"w-001"}'
                    value={formData.metadata}
                    onChange={(e) =>
                      setFormData({ ...formData, metadata: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono text-xs"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-60"
                  >
                    <ShieldCheck size={18} />
                    {formLoading ? 'Criando...' : 'Criar Licença'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Licenses;
