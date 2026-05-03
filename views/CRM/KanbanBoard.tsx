import { logger } from '@/utils/logger';
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
  Trash2,
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
      <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        <div className="p-5 sm:p-8 border-b border-slate-50 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <Plus size={20} className="sm:w-6 sm:h-6" />
            <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tighter">
              Novo Lead
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Nome Completo *
            </label>
            <input
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Nome do lead"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Telefone *
              </label>
              <input
                required
                type="tel"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Email
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="email@exemplo.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Origem do Lead
              </label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
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
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
              value={formData.organic_channel}
              onChange={(e) => setFormData({ ...formData, organic_channel: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Notas Iniciais
            </label>
            <textarea
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold min-h-[80px] text-sm"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <button
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:scale-[1.02] transition-all disabled:opacity-50 text-sm"
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
      <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100 max-h-[90vh] flex flex-col">
        <div className="p-5 sm:p-8 border-b border-slate-50 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-500 flex items-center justify-center font-black text-lg sm:text-xl shrink-0">
              {lead.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter leading-tight truncate">
                {lead.name}
              </h3>
              <p className="text-white/60 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                Detalhes do Lead
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-5 sm:p-8 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
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

        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 shrink-0">
            <button onClick={onClose} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
               Fechar
            </button>
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-shadow shadow-lg shadow-indigo-500/20">
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
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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
      setLoading(true);
      const data = await leadService.list();
      setLeads(data);
    } catch (error: any) {
      logger.error('Failed to load leads', error);
      toast.error('Erro ao carregar leads: ' + error.message);
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
      logger.error('Failed to update status', error);
      // Revert on failure
      loadLeads();
    }
  };

  const handleDeleteLead = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o lead "${name}"? Esta ação não pode ser desfeita.`)) return;

    try {
      await leadService.delete(id);
      setLeads(prev => prev.filter(l => l.id !== id));
      setSelectedLeadIds(prev => prev.filter(item => item !== id));
      toast.success('Lead excluído com sucesso');
    } catch (error: any) {
      toast.error('Erro ao excluir lead: ' + error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedLeadIds.length) return;
    if (!confirm(`Deseja realmente excluir ${selectedLeadIds.length} leads selecionados? Esta ação não pode ser desfeita.`)) return;

    setIsBulkDeleting(true);
    try {
      await leadService.bulkDelete(selectedLeadIds);
      setLeads(prev => prev.filter(l => !selectedLeadIds.includes(l.id)));
      setSelectedLeadIds([]);
      toast.success(`${selectedLeadIds.length} leads excluídos com sucesso`);
    } catch (error: any) {
      toast.error('Erro ao excluir leads em massa: ' + error.message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleLeadSelection = (id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
            Processo de Vendas
          </h1>
          <p className="text-slate-500 font-medium text-sm">Gestão inteligente de funil e leads.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar lead..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none w-full sm:w-56 md:w-64 text-sm"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-4 sm:px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all font-bold text-sm shadow-lg shadow-indigo-500/20"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">NOVO LEAD</span>
            <span className="sm:hidden">NOVO</span>
          </button>
        </div>
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

      <div className="flex-1 overflow-x-auto pb-4 -mx-4 px-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 sm:gap-4 h-full pb-2">
            {PIPELINE_STAGES.map((stage) => {
              const stageLeads = getLeadsByStage(stage.id);
              return (
                <Droppable key={stage.id} droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`w-72 sm:w-80 flex-shrink-0 flex flex-col rounded-2xl ${snapshot.isDraggingOver ? 'bg-slate-100' : 'bg-slate-50'} border border-slate-100 max-h-full`}
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
                       <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 sm:space-y-3">
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
                                 className={`bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group cursor-pointer relative ${snapshot.isDragging ? 'rotate-2 shadow-xl ring-2 ring-indigo-500/20' : ''} ${selectedLeadIds.includes(lead.id) ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : ''}`}
                               >
                                 <div 
                                   className="absolute top-2 right-2 z-20"
                                   onClick={(e) => e.stopPropagation()}
                                 >
                                   <input
                                     type="checkbox"
                                     checked={selectedLeadIds.includes(lead.id)}
                                     onChange={() => toggleLeadSelection(lead.id)}
                                     className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                   />
                                 </div>
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase shrink-0">
                                      {lead.name.slice(0, 2)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-slate-800 text-sm leading-tight truncate">
                                          {lead.name}
                                        </h4>
                                        {lead.classification && (
                                          <span
                                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter shrink-0 ${
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
                                  {/* Botões de ação - sempre visíveis no mobile */}
                                  <div className="flex items-center gap-1 shrink-0 ml-1">
                                    <button
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
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
                                    <button
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteLead(lead.id, lead.name);
                                      }}
                                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                      title="Excluir Lead"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
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

      {/* Bulk Actions Bar */}
      {selectedLeadIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-8 duration-300 border border-white/10">
          <div className="flex items-center gap-3 pr-6 border-r border-white/10">
            <span className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">
              {selectedLeadIds.length}
            </span>
            <span className="text-sm font-bold uppercase tracking-widest text-slate-300">
              Leads Selecionados
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedLeadIds([])}
              className="text-xs font-bold uppercase tracking-widest hover:text-indigo-400 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
            >
              <Trash2 size={14} />
              {isBulkDeleting ? 'Excluindo...' : 'Excluir em Massa'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
