import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Clock, CreditCard } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchWooRevenue } from '../../../services/wooControl';

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0);

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-5 rounded-xl border flex flex-col gap-2"
    style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
  >
    <div className="flex items-center justify-between text-[#9097A5]">
      <span className="text-sm font-medium">{title}</span>
      <Icon size={16} className={color} />
    </div>
    <h3 className="text-2xl font-bold text-white">{value}</h3>
  </motion.div>
);

export const Revenue = () => {
  const [revenue, setRevenue] = useState<any>({ mrr: 0, pending: 0, paid30d: 0, timeline: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchWooRevenue()
      .then((r) => {
        if (active) {
          setRevenue(r || { mrr: 0, pending: 0, paid30d: 0, timeline: [] });
          setError(null);
        }
      })
      .catch((e: any) => {
        if (active) setError(e.message || 'Falha ao carregar dados de receita');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const timelineData = (revenue.timeline || []).map((item: any) => ({
    ...item,
    label: item.month ? `${new Date(item.month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')}` : item.month,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Painel de Receita</h2>
          <p className="text-sm text-[#9097A5] mt-1">Análises financeiras, repasses e detalhamento de MRR.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          <strong>Erro ao carregar:</strong> {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="MRR Global"
          value={loading ? '...' : formatBRL(revenue.mrr)}
          icon={DollarSign}
          color="text-[#d4af37]"
        />
        <StatCard
          title="Pagamentos Pendentes"
          value={loading ? '...' : formatBRL(revenue.pending)}
          icon={Clock}
          color="text-amber-500"
        />
        <StatCard
          title="Faturamento Pago (30d)"
          value={loading ? '...' : formatBRL(revenue.paid30d)}
          icon={TrendingUp}
          color="text-emerald-500"
        />
      </div>

      {/* Chart */}
      <div className="p-6 rounded-xl border" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Linha do Tempo de Repasses</h3>
          <CreditCard size={18} className="text-[#d4af37]" />
        </div>

        {timelineData.length === 0 ? (
          <div className="h-48 flex items-center justify-center border border-dashed border-[#252A35] rounded-lg">
            <div className="text-center">
              <TrendingUp size={24} className="mx-auto mb-2 text-[#d4af37]" />
              <p className="text-[#9097A5] text-sm">Nenhum dado de receita no período.</p>
            </div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4af37" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#252A35" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#9097A5', fontSize: 11 }}
                  axisLine={{ stroke: '#252A35' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9097A5', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatBRL(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161A23',
                    border: '1px solid #252A35',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#9097A5' }}
                  formatter={(value: any) => [formatBRL(Number(value)), 'Faturamento']}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#d4af37"
                  strokeWidth={2}
                  fill="url(#revenueArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
