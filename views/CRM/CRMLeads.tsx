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
    <div className="workspace-page space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="workspace-eyebrow">Relacionamento</span>
          <h1 className="workspace-title">CRM</h1>
          <p className="workspace-subtitle mt-1">
            Base central de leads, contatos e histórico comercial.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to={kanbanPath}
            className="workspace-primary-action bg-primary text-white border-primary hover:bg-primary-hover"
          >
            <LayoutGrid size={18} />
            Abrir Kanban
          </Link>
          <Link
            to={messagesPath}
            className="workspace-primary-action"
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

      <section className="workspace-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Leads</h2>
            <p className="text-xs text-slate-500">Lista operacional separada do quadro Kanban.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="workspace-input h-10 pl-10 pr-4"
              placeholder="Buscar por nome, telefone, origem..."
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {filteredLeads.map((lead) => (
            <article key={lead.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-slate-950 truncate">{lead.name}</p>
                  <p className="text-xs font-semibold text-slate-400">{lead.classification || 'Sem classificacao'}</p>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-black text-primary">
                  {lead.status || 'Novo'}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm font-semibold text-slate-600">
                <span className="flex items-center gap-2"><Phone size={14} /> {lead.phone || '-'}</span>
                {lead.email ? <span className="flex items-center gap-2 break-all"><Mail size={14} /> {lead.email}</span> : null}
                <span className="block text-xs text-slate-400">Origem: {lead.source || '-'}</span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-slate-400">
                <span>{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : 'Sem data'}</span>
                <Link to={kanbanPath} className="text-primary">Abrir no Kanban</Link>
              </div>
            </article>
          ))}
          {filteredLeads.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-400 font-semibold">
              Nenhum lead encontrado.
            </div>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="workspace-table-head border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3">Lead</th>
                <th className="text-left px-5 py-3">Contato</th>
                <th className="text-left px-5 py-3">Origem</th>
                <th className="text-left px-5 py-3">Etapa</th>
                <th className="text-left px-5 py-3">Criado em</th>
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
  <div className="workspace-card workspace-card-hover p-5 flex items-center justify-between">
    <div>
      <p className="workspace-muted-label">{label}</p>
      <p className="text-2xl font-semibold text-slate-950 mt-1">{value}</p>
    </div>
    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
      <Icon size={21} />
    </div>
  </div>
);

export default CRMLeads;
