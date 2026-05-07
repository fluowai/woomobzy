import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar as CalendarIcon, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MessageSquare,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
  UserPlus
} from 'lucide-react';
import { leadService } from '../../services/leads';
import { Lead } from '../../types';
import { toast } from 'sonner';

const ConsultingLeads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const allLeads = await leadService.list(1, 200);
      // Filter for consulting leads only
      const filtered = allLeads.filter(l => 
        l.source?.includes('Consultoria') || 
        l.notes?.includes('Interesse: Consultoria')
      );
      setLeads(filtered);
    } catch (error) {
      toast.error('Erro ao carregar leads de consultoria');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Novo': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Em Atendimento': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Proposta': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Fechado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         l.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || l.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
            Gestão de <span className="text-red-600">Consultorias</span>
          </h1>
          <p className="text-slate-500 font-medium">Controle de leads qualificados e reuniões de implementação.</p>
        </div>
        
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            <TrendingUp size={18} className="text-red-600" />
            Relatório de Conversão
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">
            <UserPlus size={18} />
            Novo Lead Manual
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Leads Totais', value: leads.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Aguardando Reunião', value: leads.filter(l => l.status === 'Novo').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Qualificados AI', value: leads.filter(l => l.notes?.includes('Qualificado')).length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Conversão', value: '12%', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* List / Agenda View */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar lead por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">Todos os Status</option>
              <option value="Novo">Novos</option>
              <option value="Em Atendimento">Em Reunião</option>
              <option value="Proposta">Proposta</option>
              <option value="Fechado">Convertidos</option>
            </select>
            <button className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all">
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Table/List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Lead / Empresa</th>
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Qualificação AI</th>
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Agenda</th>
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-6">
                      <div className="h-4 bg-slate-100 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-slate-50 rounded w-1/4"></div>
                    </td>
                  </tr>
                ))
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <AlertCircle size={48} className="text-slate-200" />
                      <p className="text-slate-400 font-medium">Nenhum lead de consultoria encontrado.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold uppercase">
                          {lead.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-red-600 transition-colors">{lead.name}</div>
                          <div className="text-xs text-slate-500 font-medium">{lead.email}</div>
                          {lead.notes?.includes('Empresa:') && (
                            <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">
                              {lead.notes.split('|')[0].replace('Empresa: ', '')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="max-w-xs">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Qualificado</span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 italic">
                          {lead.notes?.split('|').find(n => n.includes('Interesse:'))?.replace('Interesse: ', '') || 'Interesse não detalhado'}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                          <CalendarIcon size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">Aguardando</div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pendente</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                          <MessageSquare size={18} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                          <ChevronRight size={18} />
                        </button>
                      </div>
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

export default ConsultingLeads;
