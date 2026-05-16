import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, MessageSquare, LayoutGrid, Phone, Mail, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { leadService } from '../../services/leads';
import { Lead } from '../../types';
import { logger } from '../../utils/logger';

const CRMLeads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
      [lead.name, lead.email, lead.phone, lead.source, lead.status, lead.classification]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [leads, searchTerm]);

  const kanbanPath = window.location.pathname.startsWith('/rural') ? '/rural/kanban' : '/urban/kanban';
  const messagesPath = window.location.pathname.startsWith('/rural') ? '/rural/whatsapp' : '/urban/whatsapp';

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-semibold">Carregando CRM...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.18em] text-primary">Relacionamento</span>
          <h1 className="text-3xl font-black text-slate-950 tracking-tight">CRM</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Base central de leads, contatos e histórico comercial.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to={kanbanPath}
            className="h-11 px-5 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors"
          >
            <LayoutGrid size={18} />
            Abrir Kanban
          </Link>
          <Link
            to={messagesPath}
            className="h-11 px-5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center gap-2 hover:border-primary/40 hover:text-primary transition-colors"
          >
            <MessageSquare size={18} />
            Mensagens
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Leads totais" value={leads.length} icon={Users} />
        <MetricCard label="Em atendimento" value={leads.filter((lead) => ['Em Atendimento', 'Qualificacao', 'Qualificação'].includes(String(lead.status))).length} icon={Phone} />
        <MetricCard label="Fechados" value={leads.filter((lead) => String(lead.status).toLowerCase().includes('fechado')).length} icon={Plus} />
      </div>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-slate-900">Leads</h2>
            <p className="text-xs text-slate-500">Lista operacional separada do quadro Kanban.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
              placeholder="Buscar por nome, telefone, origem..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400">Lead</th>
                <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400">Contato</th>
                <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400">Origem</th>
                <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400">Etapa</th>
                <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900">{lead.name}</p>
                    <p className="text-xs text-slate-400">{lead.classification || 'Sem classificacao'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1 text-slate-600">
                      <span className="flex items-center gap-2"><Phone size={13} /> {lead.phone}</span>
                      {lead.email ? <span className="flex items-center gap-2"><Mail size={13} /> {lead.email}</span> : null}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{lead.source || '-'}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-black">
                      {lead.status || 'Novo'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : '-'}
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400 font-semibold">
                    Nenhum lead encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: number; icon: React.ElementType }> = ({ label, value, icon: Icon }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between">
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-3xl font-black text-slate-950 mt-1">{value}</p>
    </div>
    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
      <Icon size={21} />
    </div>
  </div>
);

export default CRMLeads;
