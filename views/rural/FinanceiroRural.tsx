import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Target,
  Award,
  BarChart3,
  Home,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  PieChart,
  Users,
  DollarSign
} from 'lucide-react';
import { leadService } from '../../services/leads';
import { propertyService } from '../../services/properties';
import { Lead, Property } from '../../types';

const FinanceiroRural: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Metas Mock (Em um cenário real, viria do banco)
  const [goals] = useState({
    monthly_vgv: 50000000, // 50 Mi
    current_vgv: 32500000, // 32.5 Mi
    monthly_sales: 5,
    current_sales: 3,
    commission_rate: 0.05 // 5%
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [leadsData, propsData] = await Promise.all([
          leadService.list(),
          propertyService.list()
        ]);
        setLeads(leadsData);
        setProperties(propsData);
      } catch (error) {
        console.error('Erro ao carregar dados financeiros rurais:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const soldProperties = properties.filter(p => p.status === 'Vendido' as any);
  const totalVgv = soldProperties.reduce((acc, p) => acc + (p.price || 0), 0) || goals.current_vgv;
  const estimatedCommission = totalVgv * goals.commission_rate;

  if (loading) return <div className="p-10 text-center">Carregando indicadores...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
            <Target className="text-indigo-600" size={32} />
            Metas & Vendas Rurais
          </h1>
          <p className="text-slate-500 font-medium">
            Acompanhamento de performance, VGV e fechamento de negócios.
          </p>
        </div>
        
        <div className="flex bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-4 py-2 border-r border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta Mensal VGV</p>
            <p className="text-lg font-black text-indigo-600">R$ {(goals.monthly_vgv / 1000000).toFixed(0)} Mi</p>
          </div>
          <div className="px-4 py-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso</p>
            <p className="text-lg font-black text-emerald-600">{((totalVgv / goals.monthly_vgv) * 100).toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            label: 'VGV Acumulado',
            value: totalVgv.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            icon: TrendingUp,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            trend: '+12% vs mês anterior'
          },
          {
            label: 'Comissão Estimada',
            value: estimatedCommission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            icon: Award,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            trend: 'Baseado em 5% avg'
          },
          {
            label: 'Fazendas Vendidas',
            value: soldProperties.length || goals.current_sales,
            icon: Home,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            trend: 'Meta: 5 unidades'
          },
          {
            label: 'Ticket Médio',
            value: (totalVgv / (soldProperties.length || goals.current_sales)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            icon: PieChart,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            trend: 'Alta performance'
          }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-all group">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
              {stat.label}
            </h3>
            <p className="text-xl font-black text-slate-900 mb-2">
              {stat.value}
            </p>
            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <ArrowUpRight size={10} className="text-emerald-500" />
              {stat.trend}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Goal Progress Card */}
        <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-xl font-black uppercase italic tracking-tighter">Performance de Vendas</h4>
                <p className="text-slate-400 text-sm">Volume de negócios em relação à meta do período.</p>
              </div>
              <BarChart3 className="text-indigo-400" size={32} />
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Progresso VGV</span>
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-400">R$ {totalVgv.toLocaleString()} / R$ {goals.monthly_vgv.toLocaleString()}</span>
                </div>
                <div className="h-4 bg-white/10 rounded-full overflow-hidden p-1">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: `${(totalVgv / goals.monthly_vgv) * 100}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Negócios em Aberto</p>
                  <p className="text-2xl font-black">{leads.filter(l => l.status === 'Proposta').length} Propostas</p>
                  <p className="text-[10px] text-emerald-400 font-bold mt-1">Potencial: R$ 45 Mi</p>
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Visitas Agendadas</p>
                  <p className="text-2xl font-black">{leads.filter(l => l.status === 'Visita').length} Clientes</p>
                  <p className="text-[10px] text-indigo-400 font-bold mt-1">Conversão média: 20%</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative element */}
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>

        {/* Funnel/Pipeline Card */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <h4 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 mb-6">Funil de Vendas Rural</h4>
          <div className="space-y-4">
            {[
              { stage: 'Novos Leads', count: leads.filter(l => l.status === 'Novo').length, color: 'bg-blue-500', width: 'w-full' },
              { stage: 'Em Atendimento', count: leads.filter(l => l.status === 'Em Atendimento').length, color: 'bg-amber-500', width: 'w-4/5' },
              { stage: 'Visitas', count: leads.filter(l => l.status === 'Visita').length, color: 'bg-purple-500', width: 'w-3/5' },
              { stage: 'Proposta', count: leads.filter(l => l.status === 'Proposta').length, color: 'bg-indigo-500', width: 'w-2/5' },
              { stage: 'Fechamento', count: soldProperties.length || goals.current_sales, color: 'bg-emerald-500', width: 'w-1/5' },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.stage}</span>
                  <span className="text-xs font-black text-slate-900">{item.count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} ${item.width} rounded-full`} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-indigo-50 rounded-3xl">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-indigo-600" size={18} />
              <span className="text-xs font-black uppercase tracking-widest text-indigo-900">Conversão</span>
            </div>
            <p className="text-sm font-medium text-indigo-700">
              Sua taxa de conversão de leads para visitas aumentou <strong>15%</strong> este mês.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Transactions / Goals List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h4 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">Últimos Negócios Fechados</h4>
          <button className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors">
            Ver Relatório Completo
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Fazenda</th>
                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendedor</th>
                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor de Venda</th>
                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {soldProperties.length > 0 ? soldProperties.map((prop, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
                        {prop.images?.[0] ? <img src={prop.images[0]} alt="" className="w-full h-full object-cover" /> : <Home size={18} className="text-slate-400" />}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{prop.title}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-500 font-medium">Equipe Interna</td>
                  <td className="px-8 py-4 text-sm font-black text-emerald-600">
                    {prop.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-8 py-4">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Finalizado
                    </span>
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-400 font-medium">
                    {new Date(prop.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              )) : (
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <Home size={18} className="text-indigo-400" />
                      </div>
                      <span className="text-sm font-bold text-slate-900">Fazenda Boa Vista</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-500 font-medium">Renato Piovesana</td>
                  <td className="px-8 py-4 text-sm font-black text-emerald-600">R$ 15.200.000,00</td>
                  <td className="px-8 py-4">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Finalizado
                    </span>
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-400 font-medium">15/04/2026</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinanceiroRural;
