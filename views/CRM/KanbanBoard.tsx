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
  Copy,
  Mail,
  MapPin,
  Target,
  DollarSign,
  Tag,
  Building2,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Sparkles, TrendingUp, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { propertyService } from '../../services/properties';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orgId?: string;
  matchProfile: 'urbano' | 'rural';
}

const NewLeadModal: React.FC<NewLeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orgId,
  matchProfile,
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
        match_profile: matchProfile,
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
  onLeadUpdated: (lead: Lead) => void;
  matchProfile: 'urbano' | 'rural';
}> = ({ lead, isOpen, onClose, onEdit, onRefresh, onLeadUpdated, matchProfile }) => {
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
      const updatedLead = await leadService.matchProperties(lead.id, matchProfile);
      setRecommendations({
        profile_analysis: updatedLead.match_summary || 'Perfil analisado pela IA de matching da IMOBZY.',
        whatsapp_message: updatedLead.match_whatsapp_message || buildMatchWhatsappMessage(updatedLead, updatedLead.matched_properties || []),
        recommendations: (updatedLead.matched_properties || []).filter((match: any) => !match.engine || match.engine === matchProfile),
      });
      onRefresh();
    } catch (err) {
      logger.error('Failed to load recommendations', err);
      toast.error('Erro ao recalcular matches do lead');
    } finally {
      setLoadingRecs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'investments' && !recommendations && lead) {
      const scopedMatches = (lead.matched_properties || []).filter((match: any) => !match.engine || match.engine === matchProfile);
      if (scopedMatches.length > 0) {
        setRecommendations({
          profile_analysis: lead.match_summary || 'Matches ja calculados para este lead.',
          whatsapp_message: buildMatchWhatsappMessage(lead, scopedMatches),
          recommendations: scopedMatches,
        });
      } else {
        loadRecommendations();
      }
    }
  }, [activeTab]);

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !newActivity.description.trim()) return;
    
    setSavingActivity(true);
    try {
      const result = await leadService.addActivity(lead.id, newActivity);
      if (result.lead) {
        onLeadUpdated(result.lead);
      }
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

  const scopedMatches = (lead.matched_properties || [])
    .filter((match: any) => !match.engine || match.engine === matchProfile)
    .filter((match: any) => isWithinLeadBudget(lead, match.price));
  const topMatch = scopedMatches[0];
  const budgetRange = extractLeadBudgetRange(lead);
  const formatCurrency = (value?: number | null) =>
    value
      ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
      : 'Nao informado';
  const budgetLabel = budgetRange.min && budgetRange.max
    ? `${formatCurrency(budgetRange.min)} a ${formatCurrency(budgetRange.max)}`
    : budgetRange.max
      ? `Ate ${formatCurrency(budgetRange.max)}`
      : lead.budget
        ? formatCurrency(lead.budget)
        : 'Nao informado';
  const lastContactLabel = lead.last_contacted_at
    ? new Date(lead.last_contacted_at).toLocaleDateString('pt-BR')
    : 'Sem registro';
  const leadInitial = lead.name?.charAt(0)?.toUpperCase() || 'L';
  const profileLabel = matchProfile === 'rural' ? 'Match Rural' : 'Match Urbano';
  const bestScore = topMatch?.score ? `${topMatch.score}%` : 'Sem match';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200 h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-5 sm:px-6 border-b border-slate-200 bg-white shrink-0">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-sm">
                  {leadInitial}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-950 leading-tight truncate">
                      {lead.name}
                    </h3>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest ${
                      lead.classification?.includes('Alta') ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {lead.classification || 'Lead'}
                    </span>
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest bg-indigo-50 text-indigo-700">
                      {profileLabel}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-500">
                    <span>ID {lead.id.slice(0, 8)}</span>
                    <span>{lead.source || 'Origem nao informada'}</span>
                    <span>{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : 'Data nao informada'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={onEdit} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors font-black text-xs uppercase tracking-widest text-slate-700">
                  <User size={14} /> Editar
                </button>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors shrink-0 text-slate-500">
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  <Phone size={13} /> WhatsApp
                </div>
                <p className="text-sm font-black text-slate-900 truncate">{lead.phone || 'Nao informado'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  <DollarSign size={13} /> Orcamento
                </div>
                <p className="text-sm font-black text-slate-900 truncate">{budgetLabel}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  <Sparkles size={13} /> Melhor score
                </div>
                <p className="text-sm font-black text-emerald-700 truncate">{bestScore}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  <Clock3 size={13} /> Ultimo contato
                </div>
                <p className="text-sm font-black text-slate-900 truncate">{lastContactLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 px-3">
          <button 
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'info' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Informações Gerais
          </button>
          <button 
            onClick={() => setActiveTab('activities')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'activities' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Linha do Tempo
          </button>
          <button 
            onClick={() => setActiveTab('investments')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'investments' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Sparkles size={12} className={activeTab === 'investments' ? 'text-indigo-700' : 'text-slate-400'} />
              Match {matchProfile === 'rural' ? 'Rural' : 'Urbano'}
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-white">
          {activeTab === 'info' ? (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-5">
              <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div>
                      <h5 className="text-sm font-black text-slate-950">Resumo do lead</h5>
                      <p className="text-xs font-bold text-slate-500 mt-1">Dados principais para atendimento e qualificacao.</p>
                    </div>
                    <button
                      onClick={() => window.open(`https://wa.me/${(lead.phone || '').replace(/\D/g, '')}`, '_blank')}
                      disabled={!lead.phone}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-40"
                    >
                      <Send size={13} /> WhatsApp
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        <Phone size={13} /> Telefone
                      </div>
                      <p className="text-sm font-black text-slate-900 break-words">{lead.phone || 'Nao informado'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        <Mail size={13} /> E-mail
                      </div>
                      <p className="text-sm font-black text-slate-900 break-words">{lead.email || 'Nao informado'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        <Target size={13} /> Origem
                      </div>
                      <p className="text-sm font-black text-slate-900">{lead.source || 'Nao informada'}</p>
                      <p className="text-xs font-bold text-slate-500 mt-1">{lead.organic_channel || 'Canal direto / organico'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        <Tag size={13} /> Referencia
                      </div>
                      <p className="text-sm font-black text-indigo-700 break-words">{lead.ad_reference || 'Sem referencia'}</p>
                      <p className="text-xs font-bold text-slate-500 mt-1">Campanha: {lead.campaign || 'Nao informada'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div>
                      <h5 className="text-sm font-black text-slate-950">Perfil de compra</h5>
                      <p className="text-xs font-bold text-slate-500 mt-1">Faixa, interesse e aderencia dos matches.</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600">
                      {scopedMatches.length} matches
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Faixa de investimento</span>
                      <p className="text-2xl font-black text-slate-950 leading-tight">{budgetLabel}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Aptidoes e interesses</span>
                      <div className="flex flex-wrap gap-2">
                        {(lead.aptitude_interest || []).length > 0 ? (
                          lead.aptitude_interest?.map((apt: string) => (
                            <span key={apt} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-full text-[10px] font-black uppercase tracking-widest">{apt}</span>
                          ))
                        ) : (
                          <span className="text-xs font-bold text-slate-500">Nenhuma aptidao definida</span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white border border-slate-200 p-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Melhor recomendacao</span>
                      {topMatch ? (
                        <>
                          <p className="text-sm font-black text-slate-900 leading-snug">{topMatch.title || `Imovel ${topMatch.property_id?.slice(0, 8)}`}</p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest">{topMatch.score || 0}% match</span>
                            {topMatch.price && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest">{formatCurrency(topMatch.price)}</span>}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm font-bold text-slate-500">Nenhum match calculado dentro do perfil.</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 size={16} className="text-indigo-600" />
                    <h5 className="text-sm font-black text-slate-950">Imovel de interesse</h5>
                  </div>
                  {lead.property ? (
                    <div className="flex gap-4">
                      <div className="w-28 h-24 rounded-2xl bg-slate-100 overflow-hidden shrink-0">
                        <img src={lead.property.image} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950 leading-snug">{lead.property.title}</p>
                        <p className="text-lg font-black text-emerald-700 mt-2">
                          {lead.property.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        <p className="text-xs font-bold text-slate-500 mt-1">Imovel vinculado manualmente ao lead</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-300 p-6 text-center">
                      <Home size={28} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Nenhum imovel vinculado</p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h5 className="text-sm font-black text-slate-950">Anotacoes do corretor</h5>
                      <p className="text-xs font-bold text-slate-500 mt-1">Texto usado tambem para interpretar orcamento e perfil.</p>
                    </div>
                    <MapPin size={16} className="text-slate-300" />
                  </div>
                  <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 min-h-[128px]">
                    <p className="text-sm text-slate-800 font-semibold whitespace-pre-wrap leading-relaxed">
                      {lead.notes || 'Nenhuma nota registrada.'}
                    </p>
                  </div>
                </div>
              </section>

              <div className="hidden">
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
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><User size={18} /></div>
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
                      <Sparkles size={16} /> Máquina de Match {matchProfile === 'rural' ? 'Rural' : 'Urbano'}
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
                        Cruzando dados com o inventário {matchProfile === 'rural' ? 'rural' : 'urbano'}...
                      </p>
                    </div>
                  ) : recommendations ? (
                    <div className="space-y-8">
                       <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 border border-white/10 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                          <div className="relative z-10">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-300 mb-2 block">Perfil {matchProfile === 'rural' ? 'Rural' : 'Urbano'} Identificado</span>
                            <p className="text-lg font-bold leading-relaxed italic text-indigo-50">
                              &quot;{recommendations.profile_analysis}&quot;
                            </p>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <h6 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Top matches da máquina {matchProfile === 'rural' ? 'rural' : 'urbana'}</h6>
                          <div className="grid grid-cols-1 gap-4">
                             {recommendations.recommendations.map((rec: any, idx: number) => (
                               <div key={idx} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all group border-l-4 border-l-indigo-500">
                                  <div className="flex items-start gap-6">
                                     <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-black text-xl">
                                        {idx + 1}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">{rec.classification || 'Match IA'} • {rec.score || 0}%</span>
                                          <TrendingUp size={14} className="text-emerald-500" />
                                        </div>
                                        <p className="font-black text-slate-800 text-lg mb-1">{rec.title || `Imóvel ${rec.property_id?.slice(0, 8)}`}</p>
                                        <p className="text-xs font-bold text-slate-500 mb-3">
                                          {[rec.city, rec.state].filter(Boolean).join(' / ') || 'Localização não informada'}
                                          {rec.price ? ` • ${rec.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
                                        </p>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-600 text-sm leading-relaxed">
                                           <Lightbulb size={14} className="text-amber-500 mb-1" />
                                           <ul className="space-y-1">
                                             {(rec.reasons || ['Compatível com dados disponíveis']).map((reason: string) => (
                                               <li key={reason}>- {reason}</li>
                                             ))}
                                           </ul>
                                        </div>
                                     </div>
                                  </div>
                                </div>
                             ))}
                          </div>
                       </div>
                       {recommendations.whatsapp_message && (
                         <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6">
                           <div className="flex items-center justify-between gap-3 mb-3">
                             <h6 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Mensagem pronta para WhatsApp</h6>
                             <button
                               onClick={() => {
                                 navigator.clipboard?.writeText(recommendations.whatsapp_message);
                                 toast.success('Mensagem copiada');
                               }}
                               className="flex items-center gap-2 px-3 py-2 bg-white border border-emerald-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors"
                             >
                               <Copy size={12} /> Copiar
                             </button>
                           </div>
                           <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 font-medium font-sans">{recommendations.whatsapp_message}</pre>
                         </div>
                       )}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                       <Sparkles size={48} className="mx-auto text-slate-200 mb-4" />
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-xs mx-auto">
                         Clique em "Recalcular Perfil" para que a máquina {matchProfile === 'rural' ? 'rural' : 'urbana'} analise as notas do Kanban e sugira imóveis.
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

const buildMatchWhatsappMessage = (lead: Lead, matches: any[]) => {
  const firstName = lead.name?.split(' ')[0] || 'tudo bem';
  if (!matches.length) {
    return `Olá ${firstName}, estou analisando novas opções para o seu perfil e te aviso assim que encontrar imóveis realmente aderentes.`;
  }

  return [
    `Olá ${firstName}, encontrei alguns imóveis que combinam com o seu perfil.`,
    '',
    ...matches.slice(0, 3).flatMap((match, index) => [
      `${index + 1}. ${match.title}`,
      match.city || match.state ? `- ${[match.city, match.state].filter(Boolean).join(' / ')}` : null,
      match.price ? `- ${match.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : null,
      ...(match.reasons || []).slice(0, 2).map((reason: string) => `- ${reason}`),
      '',
    ].filter(Boolean)),
    'Posso te enviar mais detalhes?',
  ].join('\n');
};

const parseMoneyValue = (rawNumber?: string, rawUnit?: string) => {
  if (!rawNumber) return null;
  const value = Number(rawNumber.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(value)) return null;
  const unit = (rawUnit || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (['milhao', 'milhoes', 'mi', 'm'].includes(unit)) return value * 1_000_000;
  if (unit === 'mil') return value * 1_000;
  return value;
};

const extractLeadBudgetRange = (lead: Lead) => {
  const text = `${lead.notes || ''} ${lead.campaign || ''} ${lead.ad_reference || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const between = text.match(/entre\s+(?:r\$\s*)?([\d.,]+)\s*(milhoes|milhao|mi|m|mil)?\s+(?:e|a|ate)\s+(?:r\$\s*)?([\d.,]+)\s*(milhoes|milhao|mi|m|mil)?/i);
  if (between) {
    const min = parseMoneyValue(between[1], between[2] || between[4]);
    const max = parseMoneyValue(between[3], between[4] || between[2]);
    if (min && max) return { min: Math.min(min, max), max: Math.max(min, max) };
  }

  const upTo = text.match(/(?:ate|maximo|max|orcamento)\s+(?:de\s+)?(?:r\$\s*)?([\d.,]+)\s*(milhoes|milhao|mi|m|mil)?/i);
  const max = upTo ? parseMoneyValue(upTo[1], upTo[2]) : Number(lead.budget || 0);
  return max ? { min: null, max } : { min: null, max: null };
};

const isWithinLeadBudget = (lead: Lead, price?: number) => {
  const value = Number(price || 0);
  if (!value) return true;
  const budget = extractLeadBudgetRange(lead);
  if (budget.max && value > budget.max) return false;
  if (budget.min && value < budget.min) return false;
  return true;
};

const PropertyMatches: React.FC<{ lead: Lead; allProperties: any[]; matchProfile: 'urbano' | 'rural' }> = ({
  lead,
  allProperties,
  matchProfile,
}) => {
  // Matching heurístico rápido para a superfície do card
  const storedMatches = (lead.matched_properties || [])
    .filter((match: any) => !match.engine || match.engine === matchProfile)
    .filter((match: any) => isWithinLeadBudget(lead, match.price));
  const heuristicMatches = allProperties
    .filter((p) => {
      // 1. Orçamento (30% de margem)
      const budgetMatch = isWithinLeadBudget(lead, p.price);
      
      // 2. Tipo/Nicho conforme o módulo atual
      const typeText = `${p.property_type || p.type || ''} ${p.niche || ''}`.toLowerCase();
      const isRuralProperty = typeText.includes('rural') || typeText.includes('fazenda') || typeText.includes('sítio') || typeText.includes('chácara') || typeText.includes('sitio') || typeText.includes('chacara');
      const typeMatch = matchProfile === 'rural' ? isRuralProperty : !isRuralProperty;

      // 3. Estado (se especificado nas notas)
      const stateMatch = true; // Simplificado por enquanto

      return budgetMatch && typeMatch;
    })
    .sort((a, b) => b.price - a.price)
    .slice(0, 2)
    .map((p) => ({
      property_id: p.id,
      title: p.title,
      price: p.price,
      city: p.location?.city,
      state: p.location?.state,
      score: 60,
      engine: matchProfile,
      reasons: ['compativel pelo cadastro'],
    }));

  const matches = storedMatches.length > 0 ? storedMatches.slice(0, 3) : heuristicMatches;

  if (matches.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-500">
      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-2 block flex items-center gap-1">
        <Sparkles size={10} className="animate-pulse" /> Match {matchProfile === 'rural' ? 'Rural' : 'Urbano'}
      </span>
      <div className="space-y-1.5">
        {matches.map((p) => (
          <div
            key={p.property_id}
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
              {p.score ? (
                <p className="text-[8px] text-emerald-600 font-black">
                  {p.score}% match{p.city || p.state ? ` - ${[p.city, p.state].filter(Boolean).join(' / ')}` : ''}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const KanbanBoard: React.FC = () => {
  const { settings } = useSettings();
  const matchProfile: 'urbano' | 'rural' = window.location.pathname.startsWith('/rural') ? 'rural' : 'urbano';
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
  const [mobileStageId, setMobileStageId] = useState(PIPELINE_STAGES[0].id);

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

  const handleMoveLeadStage = async (leadId: string, nextStageId: string) => {
    const currentLead = leads.find((lead) => lead.id === leadId);
    if (!currentLead || currentLead.status === nextStageId) return;

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, status: nextStageId as any } : lead
      )
    );
    setMobileStageId(nextStageId);

    try {
      await leadService.updateStatus(leadId, nextStageId);
    } catch (error) {
      logger.error('Failed to update status', error);
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
        matchProfile={matchProfile}
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
        onLeadUpdated={(updatedLead) => {
          setLeads((prev) => prev.map((item) => (item.id === updatedLead.id ? updatedLead : item)));
          setSelectedLead(updatedLead);
        }}
        matchProfile={matchProfile}
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

      <div className="md:hidden -mx-4 px-4 pb-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {PIPELINE_STAGES.map((stage) => {
            const count = getLeadsByStage(stage.id).length;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setMobileStageId(stage.id)}
                className={`h-10 px-3 rounded-xl border text-[11px] font-black uppercase tracking-wide flex items-center gap-2 ${
                  mobileStageId === stage.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                <stage.icon size={12} />
                {stage.label}
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
                      className={`${stage.id === mobileStageId ? 'flex' : 'hidden md:flex'} w-full md:w-72 lg:w-80 flex-shrink-0 flex-col rounded-2xl ${snapshot.isDraggingOver ? 'bg-slate-100' : 'bg-slate-50'} border border-slate-100 max-h-full`}
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

                                <PropertyMatches lead={lead} allProperties={allProperties} matchProfile={matchProfile} />

                                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-3">
                                  <span className="flex items-center gap-1">
                                    <Clock3 size={10} />
                                    {new Date(
                                      lead.createdAt
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                <div
                                  className="mt-3 md:hidden"
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    Mover etapa
                                  </label>
                                  <select
                                    value={lead.status}
                                    onChange={(e) =>
                                      handleMoveLeadStage(lead.id, e.target.value)
                                    }
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                                  >
                                    {PIPELINE_STAGES.map((option) => (
                                      <option key={option.id} value={option.id}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
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
