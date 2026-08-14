import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Trash2,
  RefreshCw,
  Shield,
  Activity,
  Webhook,
  UserCheck,
} from 'lucide-react';

type MetaConfigRow = {
  id: string;
  meta_form_id: string | null;
  meta_campaign_id: string | null;
  meta_ad_id: string | null;
  assigned_agent_id: string | null;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type AgentOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type WebhookEvent = {
  id: string;
  meta_lead_id: string;
  event_type: string;
  status: string;
  error_message: string | null;
  processed_at: string;
};

const MetaLeadAdsSettings: React.FC = () => {
  const { profile } = useAuth();
  const [config, setConfig] = useState<MetaConfigRow[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'events'>('config');

  const [form, setForm] = useState({
    meta_form_id: '',
    meta_campaign_id: '',
    meta_ad_id: '',
    assigned_agent_id: '',
    priority: 0,
    active: true,
  });

  const isAdmin = profile?.role === 'superadmin' || profile?.role === 'admin';

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = profile?.id;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [configRes, agentsRes] = await Promise.all([
        fetch('/api/meta/lead-ads/config', { headers }),
        fetch('/api/meta/lead-ads/agents', { headers }),
      ]);

      if (!configRes.ok) throw new Error('Falha ao carregar configuração');
      if (!agentsRes.ok) throw new Error('Falha ao carregar agentes');

      const configData = await configRes.json();
      const agentsData = await agentsRes.json();

      setConfig(configData.config || []);
      setAgents(agentsData.agents || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  const loadEvents = useCallback(async () => {
    try {
      const token = profile?.id;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const res = await fetch('/api/meta/lead-ads/webhooks/events', {
        headers,
      });
      if (!res.ok) throw new Error('Falha ao carregar eventos');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (isAdmin) {
      loadConfig();
      loadEvents();
    }
  }, [isAdmin, loadConfig, loadEvents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = profile?.id;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const payload = {
        meta_form_id: form.meta_form_id || null,
        meta_campaign_id: form.meta_campaign_id || null,
        meta_ad_id: form.meta_ad_id || null,
        assigned_agent_id: form.assigned_agent_id || null,
        priority: form.priority,
        active: form.active,
      };

      const res = await fetch('/api/meta/lead-ads/config', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao salvar configuração');
      }

      setSuccess('Regra salva com sucesso');
      setForm({
        meta_form_id: '',
        meta_campaign_id: '',
        meta_ad_id: '',
        assigned_agent_id: '',
        priority: 0,
        active: true,
      });
      loadConfig();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta regra?')) return;

    try {
      const token = profile?.id;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const res = await fetch(`/api/meta/lead-ads/config/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) throw new Error('Falha ao remover regra');

      setSuccess('Regra removida');
      loadConfig();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (row: MetaConfigRow) => {
    try {
      const token = profile?.id;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const res = await fetch(`/api/meta/lead-ads/config/${row.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ active: !row.active }),
      });

      if (!res.ok) throw new Error('Falha ao atualizar regra');

      loadConfig();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Acesso restrito a administradores.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Webhook className="text-indigo-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meta Lead Ads</h1>
          <p className="text-sm text-gray-500">
            Configure roteamento automático de leads vindos do
            Facebook/Instagram
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'config'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <UserCheck size={18} />
            Regras de Roteamento
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab('events');
            loadEvents();
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'events'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity size={18} />
            Eventos do Webhook
          </div>
        </button>
      </div>

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Plus size={20} />
                Nova Regra
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Form ID
                  </label>
                  <input
                    type="text"
                    value={form.meta_form_id}
                    onChange={(e) =>
                      setForm({ ...form, meta_form_id: e.target.value })
                    }
                    placeholder="Ex: 1234567890"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Campaign ID
                  </label>
                  <input
                    type="text"
                    value={form.meta_campaign_id}
                    onChange={(e) =>
                      setForm({ ...form, meta_campaign_id: e.target.value })
                    }
                    placeholder="Ex: 9876543210"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Ad ID
                  </label>
                  <input
                    type="text"
                    value={form.meta_ad_id}
                    onChange={(e) =>
                      setForm({ ...form, meta_ad_id: e.target.value })
                    }
                    placeholder="Ex: 5555555555"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agente Responsável
                  </label>
                  <select
                    value={form.assigned_agent_id}
                    onChange={(e) =>
                      setForm({ ...form, assigned_agent_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Selecione um agente (opcional)</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridade
                  </label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        priority: parseInt(e.target.value || '0', 10),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={form.active}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.checked })
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="active" className="text-sm text-gray-700">
                    Regra ativa
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Salvar Regra
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Shield size={20} />
                  Regras Cadastradas
                </h2>
              </div>

              {config.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  Nenhuma regra cadastrada. Adicione uma regra para começar.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Agente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Prioridade
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {config.map((row) => {
                        const agent = agents.find(
                          (a) => a.id === row.assigned_agent_id
                        );
                        const targetType = row.meta_form_id
                          ? 'Form'
                          : row.meta_campaign_id
                            ? 'Campaign'
                            : 'Ad';
                        const targetId =
                          row.meta_form_id ||
                          row.meta_campaign_id ||
                          row.meta_ad_id;

                        return (
                          <tr
                            key={row.id}
                            className={!row.active ? 'opacity-50' : ''}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {targetType}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {targetId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {agent ? agent.name : 'Distribuição automática'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.priority}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleToggleActive(row)}
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  row.active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {row.active ? 'Ativo' : 'Inativo'}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleDelete(row.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity size={20} />
              Eventos Recentes
            </h2>
            <button
              onClick={loadEvents}
              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <RefreshCw size={18} />
              Atualizar
            </button>
          </div>

          {events.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nenhum evento registrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Meta Lead ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Erro
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(event.processed_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.meta_lead_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.status === 'processed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {event.status === 'processed' ? 'Processado' : 'Erro'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {event.error_message || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MetaLeadAdsSettings;
