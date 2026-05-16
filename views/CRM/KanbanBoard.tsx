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
import { Plus, X, Sparkles, TrendingUp, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { propertyService } from '../../services/properties';
import { geminiService } from '../../services/geminiService';

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
    budget: 0,
    aptitude_interest: [] as string[],
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
                Orçamento Máximo (R$)
              </label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) =>
                  setFormData({ ...formData, budget: Number(e.target.value) })
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                placeholder="Ex: 5000000"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Interesses / Aptidões
              </label>
              <div className="flex flex-wrap gap-2">
                {['Pecuária', 'Agricultura', 'Lazer', 'Investimento'].map((apt) => (
                  <button
                    key={apt}
                    type="button"
                    onClick={() => {
                      const current = formData.aptitude_interest;
                      const next = current.includes(apt)
                        ? current.filter((a) => a !== apt)
                        : [...current, apt];
                      setFormData({ ...formData, aptitude_interest: next });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      formData.aptitude_interest.includes(apt)
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    {apt}
                  </button>
                ))}
              </div>
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

const EditLeadModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lead: Lead | null;
}> = ({ isOpen, onClose, onSuccess, lead }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: '',
    ad_reference: '',
    organic_channel: '',
    notes: '',
    classification: '',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        source: lead.source || '',
        ad_reference: lead.ad_reference || '',
        organic_channel: lead.organic_channel || '',
        notes: lead.notes || '',
        classification: lead.classification || '',
      });
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await leadService.update(lead.id, formData);
      onSuccess();
      onClose();
      toast.success('Lead atualizado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao atualizar lead: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        <div className="p-5 sm:p-8 border-b border-slate-50 flex items-center justify-between bg-indigo-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <User size={20} className="sm:w-6 sm:h-6" />
            <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tighter">
              Editar Lead
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Nome Completo
            </label>
            <input
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Telefone
              </label>
              <input
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Classificação
              </label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                value={formData.classification}
                onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
              >
                <option value="Novo">Novo</option>
                <option value="Interessado">Interessado</option>
                <option value="Alta Prioridade">Alta Prioridade</option>
                <option value="Desqualificado">Desqualificado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Email
            </label>
            <input
              type="email"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Notas
            </label>
            <textarea
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold min-h-[100px] text-sm"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <button
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:scale-[1.02] transition-all disabled:opacity-50 text-sm"
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
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
  onEdit: () => void;
  onRefresh: () => void;
}> = ({ lead, isOpen, onClose, onEdit, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'activities' | 'investments'>('info');
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [newActivity, setNewActivity] = useState({ type: 'Nota', description: '' });
  const [savingActivity, setSavingActivity] = useState(false);
  
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    if (isOpen && lead) {
      loadActivities();
    }
  }, [isOpen, lead]);

  const loadActivities = async () => {
    if (!lead) return;
    setLoadingActivities(true);
    try {
      const data = await leadService.getActivities(lead.id);
      setActivities(data);
    } catch (err) {
      logger.error('Failed to load activities', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const loadRecommendations = async () => {
    if (!lead) return;
    setLoadingRecs(true);
    try {
      const properties = await propertyService.list(1, 100);
      const result = await geminiService.matchLeadWithProperties(lead, properties);
      setRecommendations(result);
    } catch (err) {
      logger.error('Failed to load recommendations', err);
    } finally {
      setLoadingRecs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'investments' && !recommendations) {
      loadRecommendations();
    }
  }, [activeTab]);

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !newActivity.description.trim()) return;
    
    setSavingActivity(true);
    try {
      await leadService.addActivity(lead.id, newActivity);
      setNewActivity({ ...newActivity, description: '' });
      toast.success('Atividade registrada!');
      loadActivities();
      onRefresh(); // Refresh lead info (like last_contacted_at)
    } catch (err: any) {
      toast.error('Erro ao salvar atividade: ' + err.message);
    } finally {
      setSavingActivity(false);
    }
  };

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100 h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-8 border-b border-slate-50 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-xl sm:text-2xl shrink-0 shadow-lg">
              {lead.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter leading-tight truncate">
                {lead.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                  lead.classification?.includes('Alta') ? 'bg-orange-500 text-white' : 'bg-white/20 text-white/80'
                }`}>
                  {lead.classification || 'Lead'}
                </span>
                <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                  ID: {lead.id.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={onEdit} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors font-bold text-xs uppercase tracking-widest">
                <User size={14} /> Editar
             </button>
             <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0">
                <X size={20} className="sm:w-6 sm:h-6" />
             </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 shrink-0">
          <button 
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'info' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Informações Gerais
          </button>
          <button 
            onClick={() => setActiveTab('activities')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'activities' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Linha do Tempo
          </button>
          <button 
            onClick={() => setActiveTab('investments')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'investments' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Sparkles size={12} className={activeTab === 'investments' ? 'text-indigo-600' : 'text-slate-400'} />
              Sugestões de Investimento
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          {activeTab === 'info' ? (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                <div className="space-y-8">
                   <section>
                     <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Canais de Contato</h5>
                     <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><Phone size={18} /></div>
                            <div className="flex flex-col">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">WhatsApp / Celular</span>
                               <span className="font-bold text-slate-700">{lead.phone}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank')}
                            className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-md shadow-emerald-500/20"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><User size={18} /></div>
                          <div className="flex flex-col">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">E-mail Corporativo</span>
                             <span className="font-bold text-slate-700">{lead.email || 'Não informado'}</span>
                          </div>
                        </div>
                     </div>
                   </section>

                   <section>
                     <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Origem do Lead</h5>
                     <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Cadeia de Origem</span>
                          <span className="px-3 py-1 bg-white text-indigo-600 rounded-full text-[10px] font-black border border-indigo-100 shadow-sm">{lead.source}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Campanha / Canal</span>
                          <p className="font-bold text-slate-700">{lead.organic_channel || 'Busca Orgânica / Direto'}</p>
                        </div>
                        {lead.ad_reference && (
                           <div>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Ref. Anúncio</span>
                            <p className="font-bold text-indigo-600">{lead.ad_reference}</p>
                          </div>
                        )}
                     </div>
                   </section>
                </div>

                <div className="space-y-8">
                   <section>
                     <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Imóvel de Interesse</h5>
                     {lead.property ? (
                        <div className="bg-white border border-slate-100 p-4 rounded-3xl flex flex-col gap-4 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                           <div className="relative h-32 rounded-2xl overflow-hidden">
                              <img src={lead.property.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              <div className="absolute top-2 left-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase italic tracking-tighter">
                                 Interesse Ativo
                              </div>
                           </div>
                           <div className="min-w-0">
                             <p className="text-sm font-black text-slate-900 mb-1 leading-tight">{lead.property.title}</p>
                             <p className="text-lg font-black text-emerald-600 tracking-tight">
                               {lead.property.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}
                             </p>
                           </div>
                        </div>
                     ) : (
                       <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-3xl text-center">
                          <Home size={32} className="mx-auto text-slate-300 mb-3" />
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum imóvel vinculado</p>
                       </div>
                     )}
                    </section>

                    <section>
                     <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Perfil do Investidor</h5>
                     <div className="bg-slate-900 p-6 rounded-3xl space-y-6">
                        <div>
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Orçamento Máximo</span>
                           <div className="text-2xl font-black text-emerald-400 italic tracking-tighter">
                              {lead.budget ? lead.budget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'}) : 'Não Definido'}
                           </div>
                        </div>
                        
                        <div>
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Aptidões de Interesse</span>
                           <div className="flex flex-wrap gap-2">
                              {(lead.aptitude_interest || []).length > 0 ? (
                                lead.aptitude_interest?.map((apt: string) => (
                                   <span key={apt} className="px-3 py-1 bg-white/10 text-white rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/5">{apt}</span>
                                ))
                              ) : (
                                <span className="text-slate-600 text-[10px] font-bold italic">Nenhuma aptidão definida</span>
                              )}
                           </div>
                        </div>
                     </div>
                   </section>

                   <section>
                     <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Anotações do Corretor</h5>
                     <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-3xl min-h-[140px] relative">
                        <p className="text-slate-800 font-medium italic text-sm whitespace-pre-wrap leading-relaxed">
                          {lead.notes || 'Nenhuma nota registrada.'}
                        </p>
                     </div>
                   </section>
                </div>
              </div>
            </div>
          ) : activeTab === 'activities' ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-8 pb-10">
               {/* Quick Activity Form */}
               <section className="bg-indigo-50/30 p-6 rounded-[2rem] border border-indigo-100/50">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-4 flex items-center gap-2">
                    <Plus size={14} /> Registrar Nova Interação
                  </h5>
                  <form onSubmit={handleAddActivity} className="space-y-4">
                     <div className="flex flex-wrap gap-2">
                        {['Nota', 'Chamada', 'WhatsApp', 'Email', 'Visita', 'Proposta'].map(type => (
                           <button
                             key={type}
                             type="button"
                             onClick={() => setNewActivity({ ...newActivity, type })}
                             className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${newActivity.type === type ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105' : 'bg-white text-slate-400 border border-slate-100 hover:border-indigo-200'}`}
                           >
                             {type}
                           </button>
                        ))}
                     </div>
                     <div className="flex gap-2">
                        <textarea
                           placeholder="O que aconteceu nesta interação?"
                           className="flex-1 px-4 py-3 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium text-sm min-h-[80px]"
                           value={newActivity.description}
                           onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                        />
                        <button
                           disabled={savingActivity || !newActivity.description.trim()}
                           className="self-end px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                           {savingActivity ? '...' : 'Salvar'}
                        </button>
                     </div>
                  </form>
               </section>

               {/* Timeline */}
               <section>
                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Linha do Tempo Completa</h5>
                  {loadingActivities ? (
                    <div className="py-10 text-center text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] animate-pulse">Carregando Histórico...</div>
                  ) : activities.length > 0 ? (
                    <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-100">
                       {activities.map((activity, idx) => (
                         <div key={activity.id} className="relative pl-12 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                            <div className={`absolute left-0 w-8 h-8 rounded-xl flex items-center justify-center z-10 shadow-sm border-2 border-white ${
                              activity.type === 'Chamada' ? 'bg-emerald-500 text-white' :
                              activity.type === 'WhatsApp' ? 'bg-green-500 text-white' :
                              activity.type === 'Visita' ? 'bg-purple-500 text-white' :
                              activity.type === 'Proposta' ? 'bg-indigo-600 text-white' :
                              activity.type === 'Status' ? 'bg-amber-500 text-white' :
                              'bg-slate-200 text-slate-600'
                            }`}>
                               {activity.type === 'Chamada' ? <Phone size={14} /> : 
                                activity.type === 'WhatsApp' ? <MessageCircle size={14} /> :
                                activity.type === 'Visita' ? <Calendar size={14} /> :
                                activity.type === 'Proposta' ? <FileCheck size={14} /> :
                                activity.type === 'Status' ? <Clock3 size={14} /> :
                                <Clock3 size={14} />}
                            </div>
                            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm group hover:shadow-md transition-shadow">
                               <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">{activity.type}</span>
                                  <span className="text-[9px] font-bold text-slate-400">{new Date(activity.created_at).toLocaleString('pt-BR')}</span>
                               </div>
                               <p className="text-sm text-slate-700 font-medium leading-relaxed">{activity.description}</p>
                               <div className="mt-2 flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500 uppercase">
                                    {activity.profiles?.name?.charAt(0) || 'S'}
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{activity.profiles?.name || 'Sistema'}</span>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                       <Clock3 size={40} className="mx-auto text-slate-200 mb-4" />
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma atividade registrada ainda</p>
                    </div>
                  )}
               </section>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-8 pb-10">
               <section>
                  <div className="flex items-center justify-between mb-6">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 flex items-center gap-2">
                      <Sparkles size={16} /> Inteligência Artificial Imobzy
                    </h5>
                    <button 
                      onClick={loadRecommendations}
                      disabled={loadingRecs}
                      className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 disabled:opacity-50 transition-colors"
                    >
                      {loadingRecs ? 'Analisando...' : 'Recalcular Perfil'}
                    </button>
                  </div>

                  {loadingRecs ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">
                        Cruzando dados com o inventário...
                      </p>
                    </div>
                  ) : recommendations ? (
                    <div className="space-y-8">
                       <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 border border-white/10 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                          <div className="relative z-10">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-300 mb-2 block">Perfil de Investidor Identificado</span>
                            <p className="text-lg font-bold leading-relaxed italic text-indigo-50 italic">
                              "{recommendations.profile_analysis}"
                            </p>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <h6 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Melhores Oportunidades Selecionadas</h6>
                          <div className="grid grid-cols-1 gap-4">
                             {recommendations.recommendations.map((rec: any, idx: number) => (
                               <div key={idx} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all group border-l-4 border-l-indigo-500">
                                  <div className="flex items-start gap-6">
                                     <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-black text-xl">
                                        {idx + 1}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Match de Alta Conversão</span>
                                          <TrendingUp size={14} className="text-emerald-500" />
                                        </div>
                                        <p className="font-black text-slate-800 text-lg mb-3">ID do Imóvel: {rec.property_id.slice(0, 8)}</p>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic text-slate-600 text-sm leading-relaxed">
                                           <Lightbulb size={14} className="text-amber-500 mb-1" />
                                           "{rec.justification}"
                                        </div>
                                     </div>
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                       <Sparkles size={48} className="mx-auto text-slate-200 mb-4" />
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-xs mx-auto">
                         Clique em "Recalcular Perfil" para que a IA analise as notas do Kanban e sugira imóveis.
                       </p>
                       <button 
                         onClick={loadRecommendations}
                         className="mt-6 px-8 py-3 bg-white border border-slate-200 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                       >
                         Iniciar Análise Inteligente
                       </button>
                    </div>
                  )}
               </section>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 shrink-0">
            <div className="flex items-center gap-4">
               <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Último Contato</span>
                  <span className="text-xs font-bold text-slate-600">{lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString('pt-BR') : 'Sem registro'}</span>
               </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                 Fechar
              </button>
              <button onClick={onEdit} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-shadow shadow-lg shadow-indigo-500/20">
                 Editar Lead
              </button>
            </div>
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
    id: 'Qualificação',
    label: 'Qualificação',
    icon: Search,
    color: 'bg-indigo-100 text-indigo-700',
  },
  {
    id: 'Visita',
    label: 'Visita Agendada',
    icon: Calendar,
    color: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'Simulação',
    label: 'Simulação / Proposta',
    icon: FileCheck,
    color: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'Documentação',
    label: 'Documentação',
    icon: Clock3,
    color: 'bg-orange-100 text-orange-700',
  },
  {
    id: 'Fechado',
    label: 'Vendido / Alugado',
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

const PropertyMatches: React.FC<{ lead: Lead; allProperties: any[] }> = ({
  lead,
  allProperties,
}) => {
  // Matching heurístico rápido para a superfície do card
  const matches = allProperties
    .filter((p) => {
      // 1. Orçamento (30% de margem)
      const budgetMatch = !lead.budget || p.price <= lead.budget * 1.3;
      
      // 2. Tipo/Nicho (Detectar se é rural/fazenda nas notas)
      const notes = (lead.notes || '').toLowerCase();
      const isRuralRequested = notes.includes('rural') || notes.includes('fazenda') || notes.includes('ha') || notes.includes('hectare');
      const typeMatch = isRuralRequested ? p.property_type === 'Rural' : true;

      // 3. Estado (se especificado nas notas)
      const stateMatch = true; // Simplificado por enquanto

      return budgetMatch && typeMatch;
    })
    .sort((a, b) => b.price - a.price)
    .slice(0, 2);

  if (matches.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-500">
      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-2 block flex items-center gap-1">
        <Sparkles size={10} className="animate-pulse" /> Sugestões de Investimento
      </span>
      <div className="space-y-1.5">
        {matches.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors group/match"
          >
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm group-hover/match:text-indigo-600 transition-colors">
              <Home size={12} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-700 truncate group-hover/match:text-indigo-600 transition-colors">
                {p.title}
              </p>
              <p className="text-[9px] text-slate-500 font-bold">
                {p.price?.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const KanbanBoard: React.FC = () => {
  const { settings } = useSettings();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [allProperties, setAllProperties] = useState<any[]>([]);

  const { profile } = useAuth();
  const isImpersonating = !!localStorage.getItem('impersonatedOrgId');
  const isSuperAdmin = profile?.role === 'superadmin';

  const targetOrgId =
    isSuperAdmin && !isImpersonating ? undefined : profile?.organization_id;

  useEffect(() => {
    if (targetOrgId || (isSuperAdmin && !isImpersonating)) {
      loadLeads();
      loadAllProperties();
    }
  }, [targetOrgId, isSuperAdmin, isImpersonating]);

  const loadAllProperties = async () => {
    try {
      const data = await propertyService.list();
      setAllProperties(data);
    } catch (error) {
      console.error('Failed to load properties for matching', error);
    }
  };

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
        onEdit={() => {
          setIsEditOpen(true);
        }}
        onRefresh={() => loadLeads()}
      />

      <EditLeadModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => {
          loadLeads();
          // Update selected lead to reflect changes in details modal if open
          if (selectedLead) {
             const updated = leads.find(l => l.id === selectedLead.id);
             if (updated) setSelectedLead(updated);
          }
        }}
        lead={selectedLead}
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
                                        {lead.notes && (
                                          <Sparkles size={10} className="text-indigo-500 animate-pulse shrink-0" />
                                        )}
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

                                <PropertyMatches lead={lead} allProperties={allProperties} />

                                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-3">
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
