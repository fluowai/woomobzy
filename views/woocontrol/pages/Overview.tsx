import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Users, 
  Server, 
  Key, 
  Activity, 
  ShieldCheck, 
  AlertTriangle,
  Layers
} from 'lucide-react';
import { fetchWooSummary, fetchWooHealthCheck, WooKpis } from '../../../services/wooControl';

const StatCard = ({ title, value, subtext, icon: Icon, trend }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-5 rounded-xl border flex flex-col gap-2"
    style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
  >
    <div className="flex items-center justify-between text-[#9097A5]">
      <span className="text-sm font-medium">{title}</span>
      <Icon size={16} />
    </div>
    <div className="flex items-baseline gap-2">
      <h3 className="text-2xl font-bold text-white">{value}</h3>
      {trend !== undefined && trend !== null && (
        <span className={`text-xs font-semibold ${trend > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <span className="text-xs text-[#9097A5]">{subtext}</span>
  </motion.div>
);

const statusMap: Record<string, { color: string; icon: any; label: string }> = {
  'Operational': { color: 'text-emerald-500', icon: ShieldCheck, label: 'Operacional' },
  'Degraded': { color: 'text-amber-500', icon: AlertTriangle, label: 'Degradado' },
  'Down': { color: 'text-red-500', icon: AlertTriangle, label: 'Indisponível' },
};

export const Overview = () => {
  const [kpis, setKpis] = useState<WooKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [healthServices, setHealthServices] = useState<any[]>([]);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchWooSummary()
      .then((k) => {
        if (active) {
          setKpis(k);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (active) setError(e.message || 'Falha ao carregar indicadores');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchWooHealthCheck()
      .then((services) => {
        if (active) setHealthServices(services);
      })
      .catch(() => {
        if (active) setHealthServices([]);
      })
      .finally(() => {
        if (active) setHealthLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const services = healthLoading
    ? []
    : healthServices.length > 0
      ? healthServices.map((s: any) => {
          const status = statusMap[s.status] || statusMap['Down'];
          return {
            name: s.name,
            status: status.label,
            icon: status.icon,
            color: status.color,
            ok: s.status === 'Operational',
          };
        })
      : [
          { name: 'API de Licenciamento', status: 'Indisponível', icon: ShieldCheck, color: 'text-red-500', ok: false },
          { name: 'Registro de Containers', status: 'Indisponível', icon: Server, color: 'text-red-500', ok: false },
          { name: 'Cluster de Banco de Dados', status: 'Indisponível', icon: Server, color: 'text-red-500', ok: false },
          { name: 'Workers de IA', status: 'Indisponível', icon: Activity, color: 'text-red-500', ok: false },
          { name: 'Relé de Heartbeat', status: 'Indisponível', icon: Activity, color: 'text-red-500', ok: false },
        ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white tracking-tight">Visão Geral Global</h2>
        <div className="flex gap-2">
          <button
            onClick={(e) => e.preventDefault()}
            className="px-4 py-2 rounded bg-[#161A23] hover:bg-[#252A35] transition-colors border border-[#252A35] text-sm text-[#9097A5]"
          >
            Últimos 30 Dias
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          <strong>Erro ao carregar:</strong> {error}
        </div>
      )}

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="MRR Total"
          value={loading ? '...' : kpis?.mrrLabel ?? 'R$ 0'}
          subtext="Receita recorrente estimada"
          icon={DollarSign}
        />
        <StatCard
          title="Licenças Ativas"
          value={loading ? '...' : String(kpis?.activeLicenses ?? 0)}
          subtext={`${kpis?.graceLicenses ?? 0} em período de carência`}
          icon={Key}
        />
        <StatCard
          title="Implantações"
          value={loading ? '...' : String(kpis?.totalDeployments ?? 0)}
          subtext={`${kpis?.offlineDeployments ?? 0} offline / ${kpis?.onlineDeployments ?? 0} ativas`}
          icon={Server}
        />
        <StatCard
          title="Total de Clientes"
          value={loading ? '...' : String(kpis?.totalCustomers ?? 0)}
          subtext={`Em ${kpis?.totalResellers ?? 0} revendas`}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl border flex flex-col" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <h3 className="text-lg font-semibold text-white mb-6">Crescimento do MRR</h3>
          <div className="flex-1 h-64 flex items-center justify-center text-[#9097A5] text-sm border border-dashed border-[#252A35] rounded-lg">
            <div className="text-center">
              <Layers size={24} className="mx-auto mb-2 text-[#d4af37]" />
              <p>Os dados financeiros históricos serão renderizados aqui</p>
              <p className="text-xs mt-1">MRR atual: {loading ? '...' : kpis?.mrrLabel ?? 'R$ 0'}</p>
            </div>
          </div>
        </div>

        {/* Platform Health */}
        <div className="p-5 rounded-xl border" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Saúde da Plataforma</h3>
            <Activity size={18} className="text-emerald-500" />
          </div>
          
          <div className="space-y-4">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-[#161A23] border border-[#252A35]">
                <div className="flex items-center gap-3">
                  <service.icon size={16} className={service.color} />
                  <span className="text-sm font-medium text-white">{service.name}</span>
                </div>
                <span className={`text-xs ${service.color}`}>{service.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
};
