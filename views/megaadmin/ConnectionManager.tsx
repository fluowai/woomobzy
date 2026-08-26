import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { callApi } from '@/src/lib/api';
import {
  Plug, Plus, Trash2, ExternalLink, CheckCircle, XCircle,
  Clock, RefreshCw, AlertCircle, DollarSign, Users, Wifi,
  Loader2, Link2, Settings
} from 'lucide-react';

interface Pool {
  totalCapacity: number;
  totalAllocated: number;
  available: number;
}

interface Billing {
  id: string;
  seller_org_id: string;
  buyer_org_id: string;
  connections_count: number;
  price_per_connection: number;
  total_amount: number;
  billing_period: string;
  status: string;
  asgardpay_invoice_id: string | null;
  asgardpay_payment_url: string | null;
  paid_at: string | null;
  created_at: string;
  seller?: { id: string; name: string; slug: string };
  buyer?: { id: string; name: string; slug: string };
}

interface Reseller {
  id: string;
  name: string;
  slug: string;
  connection_credits: number;
  connection_price_per_unit: number;
}

const ConnectionManager: React.FC = () => {
  const [pool, setPool] = useState<Pool | null>(null);
  const [billing, setBilling] = useState<Billing[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pool' | 'billing' | 'allocate' | 'social'>('pool');

  // Pool config
  const [poolCapacity, setPoolCapacity] = useState(0);
  const [savingPool, setSavingPool] = useState(false);

  // Allocate
  const [allocReseller, setAllocReseller] = useState('');
  const [allocQty, setAllocQty] = useState(1);
  const [allocPrice, setAllocPrice] = useState(0);
  const [allocating, setAllocating] = useState(false);
  const [allocPaymentUrl, setAllocPaymentUrl] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [poolData, billingData, resellersData] = await Promise.all([
        callApi('/api/mega/connections/pool'),
        callApi('/api/mega/connections/billing'),
        callApi('/api/mega/resellers'),
      ]);
      setPool(poolData);
      setPoolCapacity(poolData.totalCapacity || 0);
      setBilling(billingData);
      setResellers(resellersData.map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        connection_credits: r.connection_credits || 0,
        connection_price_per_unit: r.connection_price_per_unit || 0,
      })));
    } catch (err) {
      logger.error('Erro ao carregar dados de conexões:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePool = async () => {
    setSavingPool(true);
    try {
      await callApi('/api/mega/connections/pool/set', {
        method: 'POST',
        body: JSON.stringify({ totalCapacity: poolCapacity }),
      });
      loadData();
    } catch (err: any) {
      logger.error('Erro ao salvar pool:', err);
    } finally {
      setSavingPool(false);
    }
  };

  const handleAllocate = async () => {
    if (!allocReseller || allocQty <= 0) return;
    setAllocating(true);
    setAllocPaymentUrl(null);
    try {
      const result = await callApi('/api/mega/connections/allocate', {
        method: 'POST',
        body: JSON.stringify({
          toOrgId: allocReseller,
          quantity: allocQty,
          pricePerConnection: allocPrice,
        }),
      });
      setAllocPaymentUrl(result.paymentUrl);
      setAllocReseller('');
      setAllocQty(1);
      setAllocPrice(0);
      loadData();
    } catch (err: any) {
      logger.error('Erro ao alocar conexões:', err);
    } finally {
      setAllocating(false);
    }
  };

  const handleMarkPaid = async (billingId: string) => {
    try {
      await callApi(`/api/mega/connections/billing/${billingId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod: 'manual' }),
      });
      loadData();
    } catch (err) {
      logger.error('Erro ao marcar como pago:', err);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      active: { color: 'bg-green-500/20 text-green-400', icon: <CheckCircle size={12} />, label: 'Ativo' },
      pending: { color: 'bg-yellow-500/20 text-yellow-400', icon: <Clock size={12} />, label: 'Pendente' },
      paid: { color: 'bg-green-500/20 text-green-400', icon: <CheckCircle size={12} />, label: 'Pago' },
      revoked: { color: 'bg-red-500/20 text-red-400', icon: <XCircle size={12} />, label: 'Revogado' },
      overdue: { color: 'bg-red-500/20 text-red-400', icon: <AlertCircle size={12} />, label: 'Atrasado' },
      cancelled: { color: 'bg-gray-500/20 text-gray-400', icon: <XCircle size={12} />, label: 'Cancelado' },
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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Plug className="text-green-500" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-white">Conexões WhatsApp</h1>
            <p className="text-gray-400 text-sm">Gerencie o pool de conexões e alocações para revendas</p>
          </div>
        </div>
        <button onClick={loadData} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Settings size={14} /> Capacidade Total
          </div>
          <div className="text-2xl font-bold text-white">{pool?.totalCapacity || 0}</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Link2 size={14} /> Alocadas
          </div>
          <div className="text-2xl font-bold text-blue-400">{pool?.totalAllocated || 0}</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Plug size={14} /> Disponíveis
          </div>
          <div className="text-2xl font-bold text-green-400">{pool?.available || 0}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit">
        {[
          { key: 'pool', label: 'Configurar Pool' },
          { key: 'allocate', label: 'Liberar para Revenda' },
          { key: 'billing', label: 'Cobrança' },
          { key: 'social', label: 'Redes Sociais' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Pool Tab */}
      {tab === 'pool' && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-2">Capacidade do Pool</h2>
          <p className="text-gray-400 text-sm mb-4">
            Defina quantas conexões no total estão disponíveis para distribuir entre as revendas.
          </p>
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm text-gray-400 mb-1">Total de Conexões</label>
              <input
                type="number"
                value={poolCapacity || ''}
                onChange={(e) => setPoolCapacity(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2"
                placeholder="Ex: 500"
                min={0}
              />
            </div>
            <button
              onClick={handleSavePool}
              disabled={savingPool}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {savingPool ? <Loader2 className="animate-spin" size={16} /> : <Settings size={16} />}
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Allocate Tab */}
      {tab === 'allocate' && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-2">Liberar Conexões para Revenda</h2>
            <p className="text-gray-400 text-sm mb-4">
              Aloque conexões do pool para uma revenda. A cobrança será gerada automaticamente via AsgardPay.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Revenda</label>
                <select
                  value={allocReseller}
                  onChange={(e) => setAllocReseller(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2"
                >
                  <option value="">Selecione...</option>
                  {resellers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.connection_credits} créditos)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Quantidade</label>
                <input
                  type="number"
                  value={allocQty || ''}
                  onChange={(e) => setAllocQty(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Preço por Conexão (R$)</label>
                <input
                  type="number"
                  value={allocPrice || ''}
                  onChange={(e) => setAllocPrice(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2"
                  min={0}
                  step={0.01}
                />
              </div>
            </div>
            <button
              onClick={handleAllocate}
              disabled={allocating || !allocReseller || allocQty <= 0}
              className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {allocating ? <Loader2 className="animate-spin" size={16} /> : <Link2 size={16} />}
              Liberar e Gerar Cobrança
            </button>
          </div>

          {allocPaymentUrl && (
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="text-green-400" size={20} />
              <div className="flex-1">
                <p className="text-green-300 font-medium">Cobrança gerada com sucesso!</p>
                <a
                  href={allocPaymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 text-sm flex items-center gap-1"
                >
                  Abrir link de pagamento <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {/* Reseller Summary */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Users size={16} /> Revendas e Créditos
              </h3>
            </div>
            <div className="divide-y divide-gray-800">
              {resellers.length === 0 ? (
                <div className="p-4 text-gray-500 text-center">Nenhuma revenda encontrada</div>
              ) : (
                resellers.map((r) => (
                  <div key={r.id} className="p-4 flex items-center justify-between">
                    <div>
                      <span className="text-white font-medium">{r.name}</span>
                      <span className="text-gray-500 text-sm ml-2">({r.slug})</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">
                        Conexões: <span className="text-white font-medium">{r.connection_credits}</span>
                      </span>
                      <span className="text-gray-400">
                        Preço: <span className="text-yellow-400">R$ {r.connection_price_per_unit.toFixed(2)}</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {tab === 'billing' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <DollarSign size={16} /> Histórico de Cobrança
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left p-3">Revenda</th>
                  <th className="text-center p-3">Qtd</th>
                  <th className="text-right p-3">Preço/Un</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-left p-3">Período</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {billing.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-gray-500">
                      Nenhum registro de cobrança
                    </td>
                  </tr>
                ) : (
                  billing.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-800/50">
                      <td className="p-3 text-white">{b.buyer?.name || '-'}</td>
                      <td className="p-3 text-center text-white">{b.connections_count}</td>
                      <td className="p-3 text-right text-gray-300">R$ {b.price_per_connection.toFixed(2)}</td>
                      <td className="p-3 text-right text-yellow-400 font-medium">
                        R$ {b.total_amount.toFixed(2)}
                      </td>
                      <td className="p-3 text-gray-400">{b.billing_period}</td>
                      <td className="p-3 text-center">{statusBadge(b.status)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {b.asgardpay_payment_url && (
                            <a
                              href={b.asgardpay_payment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                              title="Link de pagamento"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                          {b.status === 'pending' && (
                            <button
                              onClick={() => handleMarkPaid(b.id)}
                              className="text-green-400 hover:text-green-300"
                              title="Marcar como pago"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Social Media Tab */}
      {tab === 'social' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-white font-semibold text-lg">Conexões de Redes Sociais</h3>
              <p className="text-gray-400 text-sm">Autentique-se nas plataformas para permitir agendamento automático.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                f
              </div>
              <div>
                <h4 className="text-white font-medium">Meta (Facebook / Instagram)</h4>
                <p className="text-gray-400 text-xs mt-1">Conecte sua conta para publicar imóveis automaticamente no Facebook e Instagram.</p>
              </div>
              <button 
                onClick={() => window.open('/api/social/auth/facebook', '_blank')}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full"
              >
                Conectar Conta Meta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionManager;
