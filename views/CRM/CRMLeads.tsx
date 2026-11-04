import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Users,
  MessageSquare,
  LayoutGrid,
  Phone,
  Mail,
  Plus,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { leadService } from '../../services/leads';
import { Lead } from '../../types';
import { logger } from '../../utils/logger';
import { LeadDistributionModal } from './LeadDistributionModal';
import { DripCampaignModal } from './DripCampaignModal';

const CRMLeads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDistributionModalOpen, setIsDistributionModalOpen] = useState(false);
  const [dripLeadId, setDripLeadId] = useState<string | null>(null);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await leadService.list();
      setLeads(data);
    } catch (error: any) {
      logger.error('Failed to load CRM leads', error);
      toast.error('Erro ao carregar CRM: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((lead) =>
      [
        lead.name,
        lead.email,
        lead.phone,
        lead.source,
        lead.status,
        lead.classification,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [leads, searchTerm]);

  const kanbanPath = window.location.pathname.startsWith('/rural')
    ? '/rural/kanban'
    : '/urban/kanban';
  const messagesPath = window.location.pathname.startsWith('/rural')
    ? '/rural/whatsapp'
    : '/urban/whatsapp';
    
  const isRural = window.location.pathname.startsWith('/rural');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
           <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Sincronizando CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-12 font-sans text-gray-900">
      
      {/* Premium Header */}
      <div className={`relative overflow-hidden rounded-2xl p-8 shadow-lg ${isRural ? 'bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 shadow-emerald-900/20' : 'bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 shadow-indigo-900/20'}`}>
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute left-0 bottom-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold tracking-wider uppercase backdrop-blur-sm border border-white/10">
                Relacionamento
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              <Briefcase className={isRural ? 'text-emerald-400' : 'text-indigo-400'} size={36} />
              CRM Intelligence
            </h1>
            <p className="text-white/70 mt-2 text-sm md:text-base max-w-xl">
              Base central de leads, contatos e histórico comercial estruturado.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              to={kanbanPath}
              className={`px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg ${isRural ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30'}`}
            >
              <LayoutGrid size={18} /> Abrir Kanban
            </Link>
            <Link 
              to={messagesPath} 
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl backdrop-blur-sm transition-all flex items-center gap-2 border border-white/20"
            >
              <MessageSquare size={18} /> Mensagens
            </Link>
            <button
              onClick={() => setIsDistributionModalOpen(true)}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl backdrop-blur-sm transition-all flex items-center gap-2 border border-white/20"
            >
              <Users size={18} /> Distribuir
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Leads Totais" value={leads.length} icon={Users} colorClass="text-blue-600" bgClass="bg-blue-50" />
        <MetricCard
          label="Em Atendimento"
          value={
            leads.filter((lead) =>
              ['Em Atendimento', 'Qualificacao', 'Qualificação'].includes(
                String(lead.status)
              )
            ).length
          }
          icon={Phone}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <MetricCard
          label="Negócios Fechados"
          value={
            leads.filter((lead) =>
              String(lead.status).toLowerCase().includes('fechado')
            ).length
          }
          icon={Plus}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Lista de Leads</h2>
            <p className="text-xs font-medium text-gray-500 mt-0.5">
              Visualização em lista, focada em dados cadastrais e origens.
            </p>
          </div>
          <div className="relative w-full md:w-96">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
              placeholder="Buscar por nome, telefone, origem..."
            />
          </div>
        </div>

        <div className="divide-y divide-gray-100 md:hidden">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="p-5 bg-white hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate text-base">
                    {lead.name}
                  </p>
                  <p className="text-xs font-semibold text-gray-400 mt-0.5 uppercase tracking-wider">
                    {lead.classification || 'Sem classificação'}
                  </p>
                </div>
                <span className={`shrink-0 rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${isRural ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
                  {lead.status || 'Novo'}
                </span>
              </div>

              <div className="space-y-2 text-sm font-medium text-gray-600 mb-4">
                <span className="flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" /> {lead.phone || '-'}
                </span>
                {lead.email && (
                  <span className="flex items-center gap-2 break-all">
                    <Mail size={14} className="text-gray-400" /> {lead.email}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div> Origem: <span className="font-semibold text-gray-900">{lead.source || '-'}</span>
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs font-bold text-gray-400">
                  {lead.createdAt
                    ? new Date(lead.createdAt).toLocaleDateString('pt-BR')
                    : 'Sem data'}
                </span>
                <Link to={kanbanPath} className={`text-sm font-bold hover:underline ${isRural ? 'text-emerald-600' : 'text-indigo-600'}`}>
                  Ver no Kanban
                </Link>
              </div>
            </div>
          ))}
          {filteredLeads.length === 0 && (
            <div className="px-5 py-16 text-center">
              <Users size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Nenhum lead encontrado.</p>
            </div>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Lead / Perfil</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Contato</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Origem</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Status da Jornada</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Data de Entrada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900 text-sm">{lead.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                      {lead.classification || 'Sem classificação'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 text-sm font-medium text-gray-600">
                      <span className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" /> {lead.phone}
                      </span>
                      {lead.email && (
                        <span className="flex items-center gap-2">
                          <Mail size={14} className="text-gray-400" /> {lead.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-semibold">
                      {lead.source || 'Desconhecida'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm ${isRural ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
                        {lead.status || 'Novo'}
                      </span>
                      <button
                        onClick={() => setDripLeadId(lead.id)}
                        className="opacity-0 group-hover:opacity-100 text-xs font-semibold text-gray-400 hover:text-indigo-600 transition-all border border-gray-200 px-2 py-1 rounded-md bg-white shadow-sm"
                        title="Automação de E-mail"
                      >
                        + Drip
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-500">
                      {lead.createdAt
                        ? new Date(lead.createdAt).toLocaleDateString('pt-BR')
                        : '-'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-16 text-center"
                  >
                     <Users size={32} className="mx-auto text-gray-300 mb-3" />
                     <p className="text-gray-500 font-medium">Nenhum lead encontrado com estes filtros.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LeadDistributionModal
        isOpen={isDistributionModalOpen}
        onClose={() => setIsDistributionModalOpen(false)}
        selectedLeadIds={leads
          .filter((l) => !l.status || l.status === 'Novo')
          .map((l) => l.id)}
        onSuccess={() => loadLeads()}
      />

      {dripLeadId && (
        <DripCampaignModal
          isOpen={!!dripLeadId}
          onClose={() => setDripLeadId(null)}
          leadId={dripLeadId}
        />
      )}
    </div>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass?: string;
  bgClass?: string;
}> = ({ label, value, icon: Icon, colorClass = "text-indigo-600", bgClass = "bg-indigo-50" }) => (
  <div className="group bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden flex items-center justify-between cursor-default">
    <div className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 ${colorClass}`}>
      <Icon size={96} />
    </div>
    
    <div className="relative z-10">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
        {label}
      </p>
      <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">
        {value}
      </h3>
    </div>
    <div className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${bgClass} ${colorClass}`}>
      <Icon size={24} />
    </div>
  </div>
);

export default CRMLeads;
