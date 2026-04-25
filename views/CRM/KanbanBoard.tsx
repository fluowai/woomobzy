import React, { useEffect, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { leadService } from '../../services/leads';
import { Lead } from '../../types';
import {
  MessageCircle,
  Phone,
  Clock3,
  FileCheck,
  CheckCircle2,
  XCircle,
  Search,
  Calendar,
  User,
  Home,
  Send,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orgId?: string;
}

const NewLeadModal: React.FC<NewLeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orgId,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'Manual / CRM',
    ad_reference: '',
    organic_channel: '',
    campaign: '',
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await leadService.create({
        ...formData,
        organization_id: orgId,
      } as any);
      onSuccess();
      onClose();
      toast.success('Lead cadastrado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao criar lead: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <Plus size={24} />
            <h3 className="text-xl font-black uppercase italic tracking-tighter">
              Cadastrar Novo Lead
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Nome Completo
            </label>
            <input
              required
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Origem do Lead
              </label>
              <select
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              >
                <option value="Manual / CRM">Manual / CRM</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="Google Ads">Google Ads</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Site / Landing Page">Site / Landing Page</option>
                <option value="Portal Imobiliário">Portal Imobiliário</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Ref. Anúncio
              </label>
              <input
                placeholder="Ex: Fazenda MS-120"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                value={formData.ad_reference}
                onChange={(e) => setFormData({ ...formData, ad_reference: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Canal Orgânico / Campanha
            </label>
            <input
              placeholder="Ex: Bio Instagram / Lançamento Verão"
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              value={formData.organic_channel}
              onChange={(e) => setFormData({ ...formData, organic_channel: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Notas Iniciais
            </label>
            <textarea
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold min-h-[100px]"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <button
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Finalizar Cadastro'}
          </button>
        </form>
      </div>
    </div>
  );
};

const LeadDetailsModal: React.FC<{
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ lead, isOpen, onClose }) => {
  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center font-black text-xl">
              {lead.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-tight">
                {lead.name}
              </h3>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest">
                Detalhes do Lead
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
               <section>
                 <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Informações de Contato</h5>
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Phone size={14} /></div>
                      <span className="font-bold text-slate-700">{lead.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><User size={14} /></div>
                      <span className="font-bold text-slate-700">{lead.email || 'Não informado'}</span>
                    </div>
                 </div>
               </section>

               <section>
                 <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Linha do Tempo</h5>
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center"><Clock3 size={14} /></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entrou em contato</span>
                        <span className="font-bold text-slate-700">{new Date(lead.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center"><Clock3 size={14} /></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Última Interação</span>
                        <span className="font-bold text-slate-700">{lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleString('pt-BR') : 'Sem registro'}</span>
                      </div>
                    </div>
                 </div>
               </section>
            </div>

            <div className="space-y-6">
               <section className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                 <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Origem & Marketing</h5>
                 <div className="space-y-5">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Cadeia de Origem</span>
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold">{lead.source}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Canal / Campanha</span>
                      <span className="font-bold text-slate-700 text-sm">{lead.organic_channel || 'Direto / Desconhecido'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Anúncio de Referência</span>
                      <span className="font-bold text-indigo-600 text-sm">{lead.ad_reference || 'Nenhum anúncio identificado'}</span>
                    </div>
                 </div>
               </section>

               {lead.property && (
                 <section>
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Imóvel de Interesse</h5>
                    <div className="bg-white border border-slate-100 p-3 rounded-2xl flex items-center gap-3 shadow-sm">
                       <img src={lead.property.image} className="w-12 h-12 rounded-xl object-cover" />
                       <div className="min-w-0">
                         <p className="text-xs font-bold text-slate-900 truncate">{lead.property.title}</p>
                         <p className="text-[11px] font-bold text-emerald-600">{lead.property.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}</p>
                       </div>
                    </div>
                 </section>
               )}
            </div>
          </div>

          <section>
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Anotações e Histórico</h5>
            <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-3xl min-h-[120px]">
               <p className="text-slate-800 font-medium italic whitespace-pre-wrap">
                 {lead.notes || 'Nenhuma nota registrada para este lead.'}
               </p>
            </div>
          </section>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-4">
           <button onClick={onClose} className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-colors">
              Fechar
           </button>
           <button className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-shadow shadow-lg shadow-indigo-500/20">
              Editar Lead
           </button>
        </div>
      </div>
    </div>
  );
};

const PIPELINE_STAGES = [
  {
    id: 'Novo',
    label: 'Novos',
    icon: MessageCircle,
    color: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'Em Atendimento',
    label: 'Em Atendimento',
    icon: Phone,
    color: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'Visita',
    label: 'Visita',
    icon: Calendar,
    color: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'Proposta',
    label: 'Proposta',
    icon: FileCheck,
    color: 'bg-indigo-100 text-indigo-700',
  },
  {
    id: 'Fechado',
    label: 'Vendido',
    icon: CheckCircle2,
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'Perdido',
    label: 'Perdido',
    icon: XCircle,
    color: 'bg-red-100 text-red-700',
  },
];

const KanbanBoard: React.FC = () => {
  const { settings } = useSettings();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { profile } = useAuth();
  const isImpersonating = !!localStorage.getItem('impersonatedOrgId');
  const isSuperAdmin = profile?.role === 'superadmin';

  const targetOrgId =
    isSuperAdmin && !isImpersonating ? undefined : profile?.organization_id;

  useEffect(() => {
    if (targetOrgId || (isSuperAdmin && !isImpersonating)) {
      loadLeads();
    }
  }, [targetOrgId, isSuperAdmin, isImpersonating]);

  const loadLeads = async () => {
    try {
      const data = await leadService.list();
      setLeads(data);
    } catch (error) {
      console.error('Failed to load leads', error);
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) return;

    // Optimistic UI Update
    const updatedLeads = leads.map((lead) =>
      lead.id === draggableId
        ? { ...lead, status: destination.droppableId as any }
        : lead
    );
    setLeads(updatedLeads);

    try {
      await leadService.updateStatus(draggableId, destination.droppableId);
    } catch (error) {
      console.error('Failed to update status', error);
      // Revert on failure
      loadLeads();
    }
  };

  const getLeadsByStage = (stageId: string) => {
    return leads.filter(
      (lead) =>
        lead.status === stageId &&
        (lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.property?.title
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()))
    );
  };

  if (loading) return <div className="p-10 text-center">Carregando CRM...</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
            PROCESSO DE VENDAS (KANBAN)
          </h1>
          <p className="text-slate-500 font-medium">Gestão inteligente de funil e leads.</p>
        </div>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar lead ou imóvel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none w-64"
          />
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all font-bold text-sm shadow-lg shadow-indigo-500/20"
        >
          <Plus size={18} />
          NOVO LEAD
        </button>
      </div>

      <NewLeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadLeads()}
        orgId={targetOrgId}
      />

      <LeadDetailsModal
        lead={selectedLead}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedLead(null);
        }}
      />

      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full min-w-max">
            {PIPELINE_STAGES.map((stage) => {
              const stageLeads = getLeadsByStage(stage.id);
              return (
                <Droppable key={stage.id} droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`w-80 flex-shrink-0 flex flex-col rounded-2xl ${snapshot.isDraggingOver ? 'bg-slate-100' : 'bg-slate-50'} border border-slate-100 max-h-full`}
                    >
                      {/* Header */}
                      <div className="p-4 border-b border-slate-100 bg-white/50 backdrop-blur rounded-t-2xl sticky top-0 z-10">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-2 ${stage.color}`}
                          >
                            <stage.icon size={12} />
                            {stage.label}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            {stageLeads.length}
                          </span>
                        </div>
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-300 rounded-full"
                            style={{
                              width: `${(stageLeads.length / (leads.length || 1)) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Cards */}
                      <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {stageLeads.map((lead, index) => (
                          <Draggable draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setIsDetailsOpen(true);
                                }}
                                className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group cursor-pointer ${snapshot.isDragging ? 'rotate-2 shadow-xl ring-2 ring-indigo-500/20' : ''}`}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                      {lead.name.slice(0, 2)}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-slate-800 text-sm leading-tight">
                                          {lead.name}
                                        </h4>
                                        {lead.classification && (
                                          <span
                                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ${
                                              lead.classification.includes(
                                                'Alta'
                                              )
                                                ? 'bg-orange-100 text-orange-600'
                                                : lead.classification.includes(
                                                      'Interessado'
                                                    )
                                                  ? 'bg-emerald-100 text-emerald-600'
                                                  : 'bg-slate-100 text-slate-500'
                                            }`}
                                          >
                                            {lead.classification}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        Via {lead.source}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation(); // Evita abrir o card (se houvesse clique no card)
                                      window.open(
                                        `https://wa.me/${lead.phone.replace(/\D/g, '')}`,
                                        '_blank'
                                      );
                                    }}
                                    className="text-emerald-500 hover:bg-emerald-50 p-1.5 rounded-lg transition-colors"
                                    title="Chamar no WhatsApp"
                                  >
                                    <MessageCircle size={16} />
                                  </button>
                                  {lead.chat_jid && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.location.href = `/rural/chat?jid=${lead.chat_jid}`;
                                      }}
                                      className="text-indigo-500 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors"
                                      title="Abrir Chat no IMOBZY"
                                    >
                                      <Send size={16} />
                                    </button>
                                  )}
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (
                                        !confirm(
                                          `Enviar mensagem de boas-vindas para ${lead.name}?`
                                        )
                                      )
                                        return;
                                      try {
                                        // Buscar configurações da Evolution API
                                        const { data: settingsData } =
                                          await supabase
                                            .from('site_settings')
                                            .select('integrations')
                                            .single();

                                        if (
                                          !settingsData?.integrations
                                            ?.evolutionApi?.enabled
                                        ) {
                                          alert(
                                            '⚠️ Evolution API não está configurada ou está desativada'
                                          );
                                          return;
                                        }

                                        const config =
                                          settingsData.integrations
                                            .evolutionApi;

                                        // Formatar telefone
                                        const cleanPhone = lead.phone.replace(
                                          /\D/g,
                                          ''
                                        );
                                        const formattedPhone =
                                          cleanPhone.length <= 11
                                            ? `55${cleanPhone}`
                                            : cleanPhone;

                                        // Mensagem
                                        const propertyTitle =
                                          lead.property?.title ||
                                          'um de nossos imóveis';
                                        const message = `Olá, ${lead.name}! 👋\n\nRecebemos seu interesse em *${propertyTitle}*.\n\nNosso especialista já foi notificado e entrará em contato em breve para tirar suas dúvidas.\n\nEnquanto isso, salve nosso contato!`;

                                        // Enviar via Evolution API
                                        const apiUrl = `${config.baseUrl}/message/sendText/${config.instanceName}`;

                                        const res = await fetch(apiUrl, {
                                          method: 'POST',
                                          headers: {
                                            apikey: config.token,
                                            'Content-Type': 'application/json',
                                          },
                                          body: JSON.stringify({
                                            number: formattedPhone,
                                            text: message,
                                          }),
                                        });

                                        if (res.ok) {
                                          alert(
                                            '✅ Mensagem enviada com sucesso! Movendo para "Em Atendimento"...'
                                          );

                                          // Atualiza no Banco
                                          await leadService.updateStatus(
                                            lead.id,
                                            'Em Atendimento'
                                          );

                                          // Atualiza na UI (Move o card)
                                          setLeads((prev) =>
                                            prev.map((l) =>
                                              l.id === lead.id
                                                ? {
                                                    ...l,
                                                    status: 'Em Atendimento',
                                                  }
                                                : l
                                            )
                                          );
                                        } else {
                                          const errorData = await res
                                            .json()
                                            .catch(() => ({}));
                                          alert(
                                            '❌ Erro ao enviar: ' +
                                              (errorData.message ||
                                                res.statusText)
                                          );
                                        }
                                      } catch (err: any) {
                                        console.error(err);
                                        alert('❌ Erro: ' + err.message);
                                      }
                                    }}
                                    className="text-indigo-500 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors"
                                    title="Testar Envio Automático"
                                  >
                                    <Send size={16} />
                                  </button>
                                </div>

                                {lead.notes && (
                                  <div className="mb-3 p-2.5 bg-amber-50/50 border border-amber-100/50 rounded-lg">
                                    <p className="text-[11px] text-amber-900 font-medium italic leading-snug">
                                      "{(lead as any).notes}"
                                    </p>
                                  </div>
                                )}

                                {lead.property && (
                                  <div className="bg-slate-50 rounded-lg p-2 flex items-center gap-3 mb-3 hover:bg-slate-100 transition-colors cursor-pointer group/prop">
                                    <img
                                      src={
                                        lead.property.image ||
                                        'https://via.placeholder.com/40'
                                      }
                                      className="w-10 h-10 rounded-md object-cover"
                                    />
                                    <div className="flex-1 overflow-hidden">
                                      <p className="text-xs font-bold text-slate-700 truncate">
                                        {lead.property.title}
                                      </p>
                                      <p className="text-[10px] text-slate-500 truncate">
                                        {lead.property.price?.toLocaleString(
                                          'pt-BR',
                                          { style: 'currency', currency: 'BRL' }
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  <span className="flex items-center gap-1">
                                    <Clock3 size={10} />
                                    {new Date(
                                      lead.createdAt
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};

export default KanbanBoard;
