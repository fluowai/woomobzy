import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { callApi } from '@/src/lib/api';
import {
  ArrowLeft,
  Copy,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

interface LicenseRow {
  id: string;
  organization_id: string;
  license_key: string;
  plan_id?: string | null;
  signing_key_id?: string | null;
  status: string;
  edition: string;
  max_installations: number;
  grace_days: number;
  blocking_policy: string;
  issued_at?: string | null;
  activated_at?: string | null;
  expires_at?: string | null;
  last_validated_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface Installation {
  id: string;
  installation_id: string;
  installation_fingerprint: string;
  name?: string | null;
  hostname?: string | null;
  platform?: string | null;
  version?: string | null;
  status: string;
  last_seen_at?: string | null;
  last_heartbeat_at?: string | null;
  last_ip?: string | null;
  activated_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
}

interface DomainRow {
  id: string;
  domain: string;
  purpose: string;
  status: string;
  dns_verified: boolean;
  verified_at?: string | null;
  ssl_status: string;
}

interface Entitlement {
  id: string;
  key: string;
  value: unknown;
  source: string;
}

interface Heartbeat {
  id: string;
  nonce: string;
  status?: string | null;
  ip_address?: string | null;
  payload?: Record<string, unknown>;
  received_at: string;
}

interface AuditEvent {
  id: string;
  action: string;
  severity: string;
  event_data?: Record<string, unknown>;
  actor_id?: string | null;
  ip_address?: string | null;
  previous_hash?: string | null;
  event_hash: string;
  created_at: string;
}

const STATUS_META: Record<string, { label: string; classes: string }> = {
  draft: { label: 'Rascunho', classes: 'bg-gray-100 text-gray-700' },
  active: { label: 'Ativa', classes: 'bg-green-100 text-green-800' },
  suspended: { label: 'Suspensa', classes: 'bg-amber-100 text-amber-800' },
  expired: { label: 'Expirada', classes: 'bg-orange-100 text-orange-800' },
  revoked: { label: 'Revogada', classes: 'bg-red-100 text-red-800' },
  blocked: { label: 'Bloqueada', classes: 'bg-slate-800 text-white' },
};

const SEVERITY_CLASSES: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  warn: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
  critical: 'bg-slate-800 text-white',
};

const TABS = [
  { id: 'instalacoes', label: 'Instalações' },
  { id: 'dominios', label: 'Domínios' },
  { id: 'entitlements', label: 'Entitlements' },
  { id: 'heartbeats', label: 'Heartbeats' },
  { id: 'auditoria', label: 'Auditoria' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const LicenseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    license: LicenseRow;
    organization: { name?: string; slug?: string } | null;
    plan: { name?: string } | null;
    installations: Installation[];
    domains: DomainRow[];
    entitlements: Entitlement[];
    heartbeats: Heartbeat[];
    auditEvents: AuditEvent[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('instalacoes');

  const fetchDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await callApi(`/api/mega/licenses/${id}`);
      setDetail(data);
      setErrorMsg(null);
    } catch (error) {
      logger.error('Error fetching license detail:', error);
      setErrorMsg((error as Error)?.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runStatusAction = async (
    action: string,
    confirmMessage: string
  ) => {
    if (!detail) return;
    if (!window.confirm(confirmMessage)) return;
    try {
      await callApi(`/api/mega/licenses/${detail.license.id}/${action}`, {
        method: 'POST',
      });
      await fetchDetail();
    } catch (error) {
      alert(`Erro: ${(error as Error)?.message}`);
    }
  };

  const handleReissueKey = async () => {
    if (!detail) return;
    if (
      !window.confirm(
        'Reemitir a chave invalida qualquer instalação que use a chave antiga. Continuar?'
      )
    )
      return;
    try {
      const response = await callApi(
        `/api/mega/licenses/${detail.license.id}/reissue-key`,
        { method: 'POST' }
      );
      window.alert(`Nova chave de licença:\n\n${response.licenseKey}`);
      await fetchDetail();
    } catch (error) {
      alert(`Erro ao reemitir chave: ${(error as Error)?.message}`);
    }
  };

  const revokeInstallation = async (installation: Installation) => {
    if (!detail) return;
    if (!window.confirm('Revogar esta instalação?')) return;
    try {
      await callApi(
        `/api/mega/licenses/${detail.license.id}/installations/${installation.id}/revoke`,
        { method: 'POST' }
      );
      await fetchDetail();
    } catch (error) {
      alert(`Erro: ${(error as Error)?.message}`);
    }
  };

  const copyText = (value: string) => {
    navigator.clipboard?.writeText(value).catch(() => undefined);
  };

  if (loading && !detail) {
    return (
      <div className="text-center text-gray-500 py-16">Carregando...</div>
    );
  }

  if (errorMsg || !detail) {
    return (
      <div>
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 border border-red-200">
          <strong>Erro ao carregar:</strong> {errorMsg}
        </div>
        <button
          onClick={() => navigate('/megaadmin/licenses')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          <ArrowLeft size={18} /> Voltar
        </button>
      </div>
    );
  }

  const { license, organization, plan } = detail;
  const status = STATUS_META[license.status] || STATUS_META.draft;

  const renderHeaderActions = () => {
    const items: Array<{
      label: string;
      action: string;
      confirm: string;
      className: string;
    }> = [];
    if (license.status === 'draft') {
      items.push(
        {
          label: 'Ativar',
          action: 'activate',
          confirm: 'Ativar esta licença?',
          className: 'bg-green-600 hover:bg-green-700',
        },
        {
          label: 'Bloquear',
          action: 'block',
          confirm: 'Bloquear (hard) esta licença?',
          className: 'bg-slate-800 hover:bg-slate-900',
        }
      );
    } else if (license.status === 'active') {
      items.push(
        {
          label: 'Suspender',
          action: 'suspend',
          confirm: 'Suspender esta licença?',
          className: 'bg-amber-500 hover:bg-amber-600',
        },
        {
          label: 'Bloquear',
          action: 'block',
          confirm: 'Bloquear (hard) esta licença?',
          className: 'bg-slate-800 hover:bg-slate-900',
        },
        {
          label: 'Revogar',
          action: 'revoke',
          confirm: 'Revogar esta licença?',
          className: 'bg-red-600 hover:bg-red-700',
        }
      );
    } else if (license.status === 'suspended' || license.status === 'expired') {
      items.push(
        {
          label: 'Reativar',
          action: 'activate',
          confirm: 'Reativar esta licença?',
          className: 'bg-green-600 hover:bg-green-700',
        },
        {
          label: 'Revogar',
          action: 'revoke',
          confirm: 'Revogar esta licença?',
          className: 'bg-red-600 hover:bg-red-700',
        }
      );
    } else if (license.status === 'blocked') {
      items.push({
        label: 'Desbloquear',
        action: 'unblock',
        confirm: 'Desbloquear esta licença?',
        className: 'bg-green-600 hover:bg-green-700',
      });
    }
    return items;
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/megaadmin/licenses')}
          className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
          title="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Detalhes da Licença</h1>
          <p className="text-gray-500">
            {organization?.name || license.organization_id}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.classes}`}
              >
                {status.label}
              </span>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                {license.edition}
              </span>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                Política: {license.blocking_policy}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-sm text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 break-all">
                {license.license_key}
              </code>
              <button
                onClick={() => copyText(license.license_key)}
                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                title="Copiar chave"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {renderHeaderActions().map((item) => (
              <button
                key={item.action}
                onClick={() => runStatusAction(item.action, item.confirm)}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium ${item.className}`}
              >
                <ShieldCheck size={18} />
                {item.label}
              </button>
            ))}
            <button
              onClick={handleReissueKey}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <RefreshCw size={18} /> Reemitir Chave
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wide">
              Plano
            </div>
            <div className="font-medium text-gray-900">{plan?.name || '—'}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wide">
              Máx. instalações
            </div>
            <div className="font-medium text-gray-900">
              {license.max_installations}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wide">
              Expira em
            </div>
            <div className="font-medium text-gray-900">
              {license.expires_at
                ? new Date(license.expires_at).toLocaleString('pt-BR')
                : 'Sem prazo'}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wide">
              Tolerância (dias)
            </div>
            <div className="font-medium text-gray-900">{license.grace_days}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wide">
              Emitida em
            </div>
            <div className="font-medium text-gray-900">
              {license.issued_at
                ? new Date(license.issued_at).toLocaleDateString('pt-BR')
                : '—'}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wide">
              Ativada em
            </div>
            <div className="font-medium text-gray-900">
              {license.activated_at
                ? new Date(license.activated_at).toLocaleDateString('pt-BR')
                : '—'}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wide">
              Última validação
            </div>
            <div className="font-medium text-gray-900">
              {license.last_validated_at
                ? new Date(license.last_validated_at).toLocaleString('pt-BR')
                : '—'}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wide">
              Chave de assinatura
            </div>
            <div className="font-medium text-gray-900 font-mono text-xs">
              {license.signing_key_id ? license.signing_key_id.slice(0, 16) : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        {activeTab === 'instalacoes' && (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Instalação
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Fingerprint
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Último heartbeat
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  IP
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {detail.installations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma instalação registrada.
                  </td>
                </tr>
              ) : (
                detail.installations.map((installation) => (
                  <tr key={installation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {installation.name || installation.hostname || 'Instalação'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {installation.platform || 'desconhecido'}
                        {installation.version ? ` v${installation.version}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs text-gray-600">
                        {installation.installation_fingerprint.slice(0, 20)}...
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          installation.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : installation.status === 'pending'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {installation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {installation.last_heartbeat_at
                        ? new Date(installation.last_heartbeat_at).toLocaleString(
                            'pt-BR'
                          )
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {installation.last_ip || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {installation.status !== 'revoked' &&
                      installation.status !== 'blocked' ? (
                        <button
                          onClick={() => revokeInstallation(installation)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                        >
                          Revogar
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'dominios' && (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Domínio
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Propósito
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  DNS
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  SSL
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {detail.domains.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Nenhum domínio vinculado.
                  </td>
                </tr>
              ) : (
                detail.domains.map((domain) => (
                  <tr key={domain.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {domain.domain}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {domain.purpose}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                        {domain.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {domain.dns_verified ? 'Verificado' : 'Pendente'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {domain.ssl_status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'entitlements' && (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Chave
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Origem
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {detail.entitlements.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    Nenhum entitlement definido.
                  </td>
                </tr>
              ) : (
                detail.entitlements.map((entitlement) => (
                  <tr key={entitlement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entitlement.key}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {JSON.stringify(entitlement.value)}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          entitlement.source === 'override'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {entitlement.source}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'heartbeats' && (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Recebido em
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nonce
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  IP
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Payload
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {detail.heartbeats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Nenhum heartbeat recebido.
                  </td>
                </tr>
              ) : (
                detail.heartbeats.map((heartbeat) => (
                  <tr key={heartbeat.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(heartbeat.received_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs text-gray-500">
                        {heartbeat.nonce.slice(0, 16)}...
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {heartbeat.status || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {heartbeat.ip_address || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <code className="text-xs">
                        {JSON.stringify(heartbeat.payload || {})}
                      </code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'auditoria' && (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Ação
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Severidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Detalhes
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Hash
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {detail.auditEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Nenhum evento de auditoria.
                  </td>
                </tr>
              ) : (
                detail.auditEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(event.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {event.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          SEVERITY_CLASSES[event.severity] || SEVERITY_CLASSES.info
                        }`}
                      >
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <code className="text-xs">
                        {JSON.stringify(event.event_data || {})}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code
                        className="text-xs text-gray-500"
                        title={`previous: ${event.previous_hash || '—'}`}
                      >
                        {event.event_hash.slice(0, 16)}...
                      </code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LicenseDetail;
