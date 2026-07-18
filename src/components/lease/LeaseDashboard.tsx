import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Key, DollarSign, AlertTriangle, Calendar, Plus,
  FileText, Clock, TrendingUp, Home, Eye, Users,
} from 'lucide-react';
import type { Lease, LeaseDashboardResumo, LeaseTimelineEvent } from '../../types/lease';
import { LEASE_STATUS_LABELS, LEASE_STATUS_COLORS, PAYMENT_STATUS_LABELS } from '../../types/lease';
import { getDashboardResumo, getDashboardTimeline, listLeases } from '../../services/lease/leaseService';

export const LeaseDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [resumo, setResumo] = useState<LeaseDashboardResumo | null>(null);
  const [events, setEvents] = useState<LeaseTimelineEvent[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('active');

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    try {
      const [resumoRes, eventsRes, leasesRes] = await Promise.all([
        getDashboardResumo(),
        getDashboardTimeline(),
        listLeases({ status: filterStatus, limit: 10 }),
      ]);
      setResumo(resumoRes.data);
      setEvents(eventsRes.data);
      setLeases(leasesRes.data);
    } catch (error) {
      logger.error('Dashboard load error:', error);
    }
  };

  const stats = [
    { icon: Key, label: 'Contratos Ativos', value: String(resumo?.ativos || 0), color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: DollarSign, label: 'Receita Mensal', value: `R$ ${(resumo?.receita_mensal || 0).toLocaleString('pt-BR')}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: AlertTriangle, label: 'Inadimplentes', value: String(resumo?.inadimplentes || 0), color: 'text-red-600', bg: 'bg-red-50' },
    { icon: TrendingUp, label: 'Vencer em 30 dias', value: String(resumo?.vencendo_30_dias || 0), color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: FileText, label: 'Em Andamento', value: String(resumo?.em_andamento || 0), color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: Home, label: 'Total de Contratos', value: String(resumo?.total || 0), color: 'text-slate-600', bg: 'bg-slate-50' },
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'due': return DollarSign;
      case 'adjustment': return TrendingUp;
      case 'end': return Clock;
      default: return Calendar;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'due': return 'text-blue-600 bg-blue-50';
      case 'adjustment': return 'text-purple-600 bg-purple-50';
      case 'end': return 'text-amber-600 bg-amber-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black uppercase italic tracking-tighter flex items-center gap-3">
            <Key className="text-blue-600" size={32} />
            Gestão de <span className="text-blue-600">Locação</span>
          </h1>
          <p className="text-black/60 font-medium">
            Contratos ativos, reajustes, inadimplência e boletos.
          </p>
        </div>
        <button
          onClick={() => navigate('/urban/locacao/novo')}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus size={18} /> Novo Contrato
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} w-fit mb-3`}>
              <stat.icon size={20} />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-slate-900 italic tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">Próximos Eventos</h3>
          </div>
          <div className="space-y-4">
            {events.length === 0 && (
              <p className="text-sm text-slate-400 italic">Nenhum evento próximo</p>
            )}
            {events.slice(0, 10).map((event, idx) => {
              const Icon = getEventIcon(event.type);
              const colorClass = getEventColor(event.type);
              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl ${colorClass} shrink-0`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{event.label}</p>
                    <p className="text-[10px] text-slate-400 truncate">{event.description}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                    event.days_until <= 5 ? 'bg-red-50 text-red-600' :
                    event.days_until <= 15 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'
                  }`}>
                    {event.days_until <= 0 ? 'HOJE' : `${event.days_until}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leases Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">Contratos</h3>
            <div className="flex gap-1 bg-slate-50 rounded-xl p-1">
              {[
                { status: 'active', label: 'Ativos' },
                { status: 'pending_signatures', label: 'Assinatura' },
                { status: 'draft', label: 'Rascunhos' },
              ].map((f) => (
                <button
                  key={f.status}
                  onClick={() => setFilterStatus(f.status)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    filterStatus === f.status ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-50">
            {leases.map((lease) => (
              <div
                key={lease.id}
                onClick={() => navigate(`/urban/locacao/${lease.id}`)}
                className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer transition-all group"
              >
                <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-white">
                  <FileText size={18} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{lease.tenant_name}</p>
                  <p className="text-[10px] text-slate-400">
                    {lease.contract_number} · {lease.property_title || 'Sem imóvel'} · R$ {(lease.monthly_rent || 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    PAYMENT_STATUS_LABELS[lease.payment_status || 'em_dia']
                      ? lease.payment_status === 'inadimplente' ? 'bg-red-50 text-red-700' :
                        lease.payment_status === 'atrasado' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-50 text-slate-500'
                  }`}>
                    {PAYMENT_STATUS_LABELS[lease.payment_status || 'em_dia'] || 'N/A'}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${LEASE_STATUS_COLORS[lease.status] || 'bg-slate-50 text-slate-500'}`}>
                    {LEASE_STATUS_LABELS[lease.status] || lease.status}
                  </span>
                  <Eye size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              </div>
            ))}
            {leases.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Key className="mx-auto mb-3 text-slate-300" size={40} />
                <p className="font-medium">Nenhum contrato encontrado</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
