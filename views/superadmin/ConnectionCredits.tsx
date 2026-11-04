import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { callApi } from '@/src/lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  Plug, Link2, Unlink, CheckCircle, Clock, AlertCircle,
  RefreshCw, Loader2, ExternalLink, Wifi
} from 'lucide-react';

interface Allocation {
  id: string;
  from_org_id: string;
  to_org_id: string;
  instance_id: string | null;
  allocation_type: string;
  status: string;
  allocated_at: string;
  from_org?: { id: string; name: string; slug: string };
  instance?: { id: string; name: string; phone: string; status: string };
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

const ConnectionCredits: React.FC = () => {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedInstance, setSelectedInstance] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (orgId) loadData();
  }, [orgId]);

  const loadData = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [allocData, tenantData] = await Promise.all([
        callApi(`/api/mega/connections/allocations/${orgId}`),
        callApi('/api/mega/resellers').catch(() => []),
      ]);

      setAllocations(allocData.asBuyer || []);
      setCredits(allocData.credits || 0);

      const childTenants = tenantData
        ?.filter((t: any) => t.parent_id === orgId || t.parent_id?.id === orgId)
        .map((t: any) => ({ id: t.id, name: t.name, slug: t.slug })) || [];
      setTenants(childTenants);
    } catch (err) {
      logger.error('Erro ao carregar créditos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocateToTenant = async () => {
    if (!selectedTenant) {
      setError('Selecione uma imobiliária');
      return;
    }
    setAllocating(true);
    setError('');
    try {
      await callApi('/api/mega/connections/allocate/tenant', {
        method: 'POST',
        body: JSON.stringify({
          toTenantId: selectedTenant,
          instanceId: selectedInstance || undefined,
        }),
      });
      setSelectedTenant('');
      setSelectedInstance('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao alocar');
    } finally {
      setAllocating(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      active: { color: 'bg-green-500/20 text-green-400', icon: <CheckCircle size={12} />, label: 'Ativo' },
      pending: { color: 'bg-yellow-500/20 text-yellow-400', icon: <Clock size={12} />, label: 'Pendente' },
      revoked: { color: 'bg-red-500/20 text-red-400', icon: <Unlink size={12} />, label: 'Revogado' },
    };
    const s = map[status] || map.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
        {s.icon} {s.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-green-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Plug className="text-green-500" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-white">Créditos de Conexão</h1>
            <p className="text-gray-400 text-sm">Suas conexões WhatsApp Cloud API e alocações para imobiliárias</p>
          </div>
        </div>
        <button onClick={loadData} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Credit Card */}
      <div className="bg-gradient-to-r from-green-900/40 to-blue-900/40 rounded-xl p-6 border border-green-800/50">
        <div className="flex items-center gap-3 mb-2">
          <Wifi className="text-green-400" size={24} />
          <span className="text-gray-300 text-sm">Conexões Disponíveis</span>
        </div>
        <div className="text-4xl font-bold text-white">{credits}</div>
        <p className="text-gray-400 text-sm mt-1">conexões Cloud API disponíveis para suas imobiliárias</p>
      </div>

      {/* Allocate to Tenant */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Link2 size={18} /> Alocar para Imobiliária
        </h2>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Imobiliária</label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2"
              disabled={allocating}
            >
              <option value="">Selecione...</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAllocateToTenant}
              disabled={allocating || !selectedTenant || credits <= 0}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {allocating ? <Loader2 className="animate-spin" size={16} /> : <Link2 size={16} />}
              Alocar Conexão
            </button>
          </div>
        </div>

        {credits <= 0 && (
          <p className="mt-3 text-yellow-400 text-sm">
            Sem créditos disponíveis. Entre em contato com o administrador da plataforma.
          </p>
        )}
      </div>

      {/* Allocations List */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Link2 size={16} /> Alocações Recebidas
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left p-3">Alocado por</th>
                <th className="text-left p-3">Instância</th>
                <th className="text-center p-3">Status</th>
                <th className="text-left p-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {allocations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">
                    Nenhuma alocação recebida
                  </td>
                </tr>
              ) : (
                allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-800/50">
                    <td className="p-3 text-white">{a.from_org?.name || '-'}</td>
                    <td className="p-3 text-gray-300">
                      {a.instance ? `${a.instance.name} (${a.instance.phone || 'sem número'})` : 'Não vinculada'}
                    </td>
                    <td className="p-3 text-center">{statusBadge(a.status)}</td>
                    <td className="p-3 text-gray-400">
                      {new Date(a.allocated_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConnectionCredits;
