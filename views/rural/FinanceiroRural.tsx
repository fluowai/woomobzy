import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Target,
  Award,
  BarChart3,
  Home,
  ArrowUpRight,
  PieChart,
  Users,
  Save
} from 'lucide-react';
import { leadService } from '../../services/leads';
import { propertyService } from '../../services/properties';
import { Lead, Property } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { toast } from 'sonner';

const FinanceiroRural: React.FC = () => {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goals, setGoals] = useState({
    monthly_vgv: 0,
    monthly_sales: 0,
    commission_rate: 0.05,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const month = new Date();
        month.setDate(1);
        const periodMonth = month.toISOString().slice(0, 10);
        const [leadsData, propsData, goalResult] = await Promise.all([
          leadService.list(),
          propertyService.list(1, 100, 'rural'),
          profile?.organization_id
            ? supabase
                .from('rural_financial_goals')
                .select('target_vgv,target_sales,commission_rate')
                .eq('organization_id', profile.organization_id)
                .eq('period_month', periodMonth)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);
        setLeads(
          leadsData.filter(
            (lead: any) =>
              lead.match_profile === 'rural' ||
              lead.preferences?.niche === 'rural' ||
              lead.preferences?.profile === 'rural',
          ),
        );
        setProperties(propsData);
        if (goalResult.data) {
          setGoals({
            monthly_vgv: Number(goalResult.data.target_vgv || 0),
            monthly_sales: Number(goalResult.data.target_sales || 0),
            commission_rate: Number(goalResult.data.commission_rate || 0.05),
          });
        }
      } catch (error) {
        logger.error('Erro ao carregar dados financeiros rurais:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [profile?.organization_id]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const soldProperties = properties.filter((property) => {
    if (property.status !== ('Vendido' as any)) return false;
    const soldAt = new Date((property as any).updated_at || (property as any).created_at || 0);
    return soldAt.getMonth() === currentMonth && soldAt.getFullYear() === currentYear;
  });
  const totalVgv = soldProperties.reduce((acc, p) => acc + (p.price || 0), 0);
  const estimatedCommission = totalVgv * goals.commission_rate;
  const goalProgress = goals.monthly_vgv > 0 ? Math.min((totalVgv / goals.monthly_vgv) * 100, 100) : 0;
  const proposalLeads = leads.filter((lead) => lead.status === 'Proposta');
  const proposalPotential = proposalLeads.reduce((sum, lead) => sum + Number(lead.budget || 0), 0);
  const visitLeads = leads.filter((lead) => lead.status === 'Visita');
  const visitConversion = leads.length > 0 ? (visitLeads.length / leads.length) * 100 : 0;

  const saveGoal = async () => {
    if (!profile?.organization_id) return;
    setSavingGoal(true);
    const month = new Date();
    month.setDate(1);
    const { error } = await supabase.from('rural_financial_goals').upsert(
      {
        organization_id: profile.organization_id,
        period_month: month.toISOString().slice(0, 10),
        target_vgv: goals.monthly_vgv,
        target_sales: goals.monthly_sales,
        commission_rate: goals.commission_rate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,period_month' },
    );
    setSavingGoal(false);
    if (error) {
      toast.error('Não foi possível salvar as metas rurais.');
    } else {
      toast.success('Metas rurais salvas.');
    }
  };

  if (loading) return <div className="p-10 text-center">Carregando indicadores...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
            <Target className="text-indigo-600" size={32} />
            Metas & Vendas Rurais
          </h1>
          <p className="text-slate-500 font-medium">
            Acompanhamento de performance, VGV e fechamento de negócios.
          </p>
        </div>
        
        <div className="flex bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-4 py-2 border-r border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Meta Mensal VGV</p>
            <input
              type="number"
              min="0"
              value={goals.monthly_vgv}
              onChange={(event) => setGoals((current) => ({ ...current, monthly_vgv: Number(event.target.value) }))}
              className="w-36 bg-transparent text-lg font-bold text-indigo-600 outline-none"
              aria-label="Meta mensal de VGV rural"
            />
          </div>
          <div className="px-4 py-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progresso</p>
            <p className="text-lg font-bold text-emerald-600">{goalProgress.toFixed(1)}%</p>
          </div>
          <button onClick={saveGoal} disabled={savingGoal} title="Salvar metas rurais" className="p-3 text-indigo-600 disabled:opacity-50">
            <Save size={20} />
          </button>
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
            trend: 'Vendas do mês'
          },
          {
            label: 'Comissão Estimada',
            value: estimatedCommission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            icon: Award,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            trend: `Taxa ${(goals.commission_rate * 100).toFixed(2)}%`
          },
          {
            label: 'Fazendas Vendidas',
            value: soldProperties.length,
            icon: Home,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            trend: `Meta: ${goals.monthly_sales} unidades`
          },
          {
            label: 'Ticket Médio',
            value: (soldProperties.length > 0 ? totalVgv / soldProperties.length : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
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
            <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
              {stat.label}
            </h3>
            <p className="text-xl font-bold text-slate-900 mb-2">
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
                <h4 className="text-xl font-bold uppercase italic tracking-tighter">Performance de Vendas</h4>
                <p className="text-slate-400 text-sm">Volume de negócios em relação à meta do período.</p>
              </div>
              <BarChart3 className="text-indigo-400" size={32} />
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Progresso VGV</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">R$ {totalVgv.toLocaleString()} / R$ {goals.monthly_vgv.toLocaleString()}</span>
                </div>
                <div className="h-4 bg-white/10 rounded-full overflow-hidden p-1">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: `${goalProgress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Negócios em Aberto</p>
                  <p className="text-2xl font-bold">{leads.filter(l => l.status === 'Proposta').length} Propostas</p>
                  <p className="text-[10px] text-emerald-400 font-bold mt-1">Potencial: {proposalPotential.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Visitas Agendadas</p>
                  <p className="text-2xl font-bold">{leads.filter(l => l.status === 'Visita').length} Clientes</p>
                  <p className="text-[10px] text-indigo-400 font-bold mt-1">Participação no funil: {visitConversion.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative element */}
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>

        {/* Funnel/Pipeline Card */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <h4 className="text-xl font-bold uppercase italic tracking-tighter text-slate-900 mb-6">Funil de Vendas Rural</h4>
          <div className="space-y-4">
            {[
              { stage: 'Novos Leads', count: leads.filter(l => l.status === 'Novo').length, color: 'bg-blue-500', width: 'w-full' },
              { stage: 'Em Atendimento', count: leads.filter(l => l.status === 'Em Atendimento').length, color: 'bg-amber-500', width: 'w-4/5' },
              { stage: 'Visitas', count: leads.filter(l => l.status === 'Visita').length, color: 'bg-purple-500', width: 'w-3/5' },
              { stage: 'Proposta', count: leads.filter(l => l.status === 'Proposta').length, color: 'bg-indigo-500', width: 'w-2/5' },
              { stage: 'Fechamento', count: soldProperties.length, color: 'bg-emerald-500', width: 'w-1/5' },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.stage}</span>
                  <span className="text-xs font-bold text-slate-900">{item.count}</span>
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
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-900">Conversão</span>
            </div>
            <p className="text-sm font-medium text-indigo-700">
              {leads.length > 0
                ? `${visitConversion.toFixed(1)}% dos leads rurais estão na etapa de visita.`
                : 'Classifique os leads com perfil rural para acompanhar a conversão.'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Transactions / Goals List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h4 className="text-xl font-bold uppercase italic tracking-tighter text-slate-900">Últimos Negócios Fechados</h4>
          <button className="text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors">
            Ver Relatório Completo
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fazenda</th>
                <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vendedor</th>
                <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor de Venda</th>
                <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</th>
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
                  <td className="px-8 py-4 text-sm font-bold text-emerald-600">
                    {prop.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-8 py-4">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      Finalizado
                    </span>
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-400 font-medium">
                    {new Date(prop.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-10 text-center text-sm text-slate-400">
                    Nenhuma venda rural registrada neste mês.
                  </td>
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
