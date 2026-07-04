import { logger } from '@/utils/logger';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvided,
  DraggableStateSnapshot,
} from '@hello-pangea/dnd';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate } from 'react-router-dom';
import { leadService } from '../../services/leads';
import { Lead } from '../../types';
import {
  MessageCircle, Phone, Clock3, FileCheck, CheckCircle2, XCircle,
  Search, Calendar, User, Home, Send, Trash2, Copy, Mail, MapPin,
  Target, DollarSign, Tag, Building2, LayoutGrid, Plus, X, Sparkles,
  TrendingUp, Lightbulb,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { chatApi, instanceApi } from '../WhatsApp/hooks/api';
import {
  PIPELINE_STAGES, INTENT_FILTERS, IntentFilter, PipelineStage,
  StagePageState, createEmptyStageState,
} from './kanban/constants';
import {
  getLeadDisplayName, getLeadInitials, getSlaInfo, getScoreBadge,
  getLeadWhatsAppFallbackUrl, openLeadWhatsAppConversation,
  isWithinLeadBudget, extractLeadBudgetRange,
  getCustomStageStorageKey, normalizeStageId,
  loadCustomStages, saveCustomStages,
} from './kanban/helpers';

// ─── NewLeadModal ─────────────────────────────────────────────────────────────
interface NewLeadModalProps {
  isOpen: boolean; onClose: () => void; onSuccess: () => void;
  orgId?: string; matchProfile: 'urbano' | 'rural';
}
const NewLeadModal: React.FC<NewLeadModalProps> = ({ isOpen, onClose, onSuccess, orgId, matchProfile }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', source: 'CRM',
    status: 'Novo', classification: matchProfile === 'rural' ? 'Interesse Rural' : 'Interesse Urbano',
    notes: '', budget: undefined as number | undefined,
    preferences: { type: undefined, neighborhood: '' },
  });

  useEffect(() => {
    if (isOpen) setFormData((prev) => ({ ...prev, status: 'Novo', classification: matchProfile === 'rural' ? 'Interesse Rural' : 'Interesse Urbano' }));
  }, [isOpen, matchProfile]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim()) { toast.error('Nome é obrigatório'); return; }
    setLoading(true);
    try {
      await leadService.create({ ...formData, organization_id: orgId });
      toast.success('Lead criado com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      logger.error('Erro ao criar lead', error);
      toast.error(error?.message || 'Erro ao criar lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Novo Lead</h3>
            <p className="text-xs font-semibold text-slate-400">Adicionar lead manualmente</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Nome *</label>
              <input value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10" placeholder="Nome do lead" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Telefone</label>
              <input value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10" placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Email</label>
              <input value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10" placeholder="lead@email.com" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Classificação</label>
              <select value={formData.classification} onChange={(e) => setFormData((prev) => ({ ...prev, classification: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10">
                <option>Interesse Rural</option>
                <option>Interesse Urbano</option>
                <option>Proprietário</option>
                <option>Corretor</option>
                <option>Investidor</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Origem</label>
              <select value={formData.source} onChange={(e) => setFormData((prev) => ({ ...prev, source: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10">
                <option>CRM</option><option>WhatsApp</option><option>Portal</option><option>Indicação</option><option>Landing Page</option><option>Site</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Observações</label>
              <textarea value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} className="h-20 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10" placeholder="Anotações..." />
            </div>
          </div>
          <button type="submit" disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{loading ? 'Salvando...' : 'Criar Lead'}</button>
        </form>
      </div>
    </div>
  );
};

// ─── EditLeadModal ────────────────────────────────────────────────────────────
const EditLeadModal: React.FC<{
  isOpen: boolean; lead: Lead | null;
  onClose: () => void; onSaved: (lead: Lead) => void;
}> = ({ isOpen, lead, onClose, onSaved }) => {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '', classification: '', tags: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) setFormData({
      name: lead.name || '', phone: lead.phone || '', email: lead.email || '',
      notes: lead.notes || '', classification: lead.classification || '',
      tags: (lead.tags || []).join(', '),
    });
  }, [lead]);

  if (!isOpen || !lead) return null;

  const handleSave = async () => {
    setSaving(true);
    const tags = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);
    await leadService.update(lead.id, { ...formData, tags } as any);
    onSaved({ ...lead, ...formData, tags } as Lead);
    setSaving(false);
    onClose();
    toast.success('Lead atualizado');
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-950">Editar Lead</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-indigo-400" placeholder="Nome" />
          <div className="grid grid-cols-2 gap-3">
            <input value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-indigo-400" placeholder="Telefone" />
            <input value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-indigo-400" placeholder="Email" />
          </div>
          <input value={formData.classification} onChange={(e) => setFormData((p) => ({ ...p, classification: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-indigo-400" placeholder="Classificação" />
          <textarea value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} className="h-20 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:border-indigo-400" placeholder="Observações" />
          <input value={formData.tags} onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-indigo-400" placeholder="Tags (separadas por vírgula)" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-5 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
};

// ─── LeadDetailsModal ─────────────────────────────────────────────────────────
const LeadDetailsModal: React.FC<{
  isOpen: boolean; lead: Lead | null; onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string, name: string) => void;
  stages: PipelineStage[];
  navigate: (path: string) => void;
}> = ({ isOpen, lead, onClose, onStatusChange, onDelete, stages, navigate }) => {
  const [matchingProperties, setMatchingProperties] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !lead?.id) return;
    setMatchingProperties([]);
    setLoadingMatches(true);
    const fetchMatches = async () => {
      try {
        const { data } = await supabase.rpc('match_properties_to_lead', { lead_id: lead.id, max_results: 5 });
        setMatchingProperties(data || []);
      } catch { /* silencio */ }
      setLoadingMatches(false);
    };
    fetchMatches();
  }, [isOpen, lead?.id]);

  const handleCopyMessage = async () => {
    const msg = `*Lead:* ${lead?.name}\n*Telefone:* ${lead?.phone}\n*Email:* ${lead?.email}\n*Classificação:* ${lead?.classification || '-'}\n*Origem:* ${lead?.source}\n*Observações:* ${lead?.notes || '-'}`;
    await navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !lead) return null;

  const sla = getSlaInfo(lead);

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4 pt-10 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">{getLeadInitials(lead)}</div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">{getLeadDisplayName(lead)}</h2>
              <p className="text-xs font-semibold text-slate-400">{lead.classification || 'Sem classificação'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Telefone</p>
              <div className="mt-1 flex items-center gap-2">
                <Phone size={14} className="text-slate-400" />
                <a href={`tel:${lead.phone}`} className="text-sm font-bold text-slate-800 hover:text-indigo-600">{lead.phone || '-'}</a>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</p>
              <div className="mt-1 flex items-center gap-2">
                <Mail size={14} className="text-slate-400" />
                <span className="truncate text-sm font-bold text-slate-800">{lead.email || '-'}</span>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Origem</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{lead.source || '-'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
              <span className={`mt-1 inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase ${stages.find((s) => s.id === lead.status)?.color || 'bg-slate-100 text-slate-600'}`}>{lead.status}</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Score</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{lead.lead_score ?? '-'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SLA</p>
              <p className={`mt-1 text-sm font-bold ${sla.labelClass}`}>{sla.label || 'Em dia'}</p>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Observações</h4>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="whitespace-pre-wrap text-sm font-semibold text-slate-700">{lead.notes || 'Nenhuma observação.'}</p>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Imóveis recomendados</h4>
              {lead.id && (
                <button
                  onClick={async () => {
                    setLoadingMatches(true);
                    const { data } = await supabase.rpc('match_properties_to_lead', { lead_id: lead.id, max_results: 5 });
                    setMatchingProperties(data || []);
                    setLoadingMatches(false);
                  }}
                  className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-600"
                  disabled={loadingMatches}
                >
                  <Sparkles size={12} /> {loadingMatches ? 'Analisando...' : 'Atualizar matches'}
                </button>
              )}
            </div>
            {matchingProperties.length > 0 ? (
              <div className="space-y-2">
                {matchingProperties.map((match, i) => {
                  const budgetCheck = isWithinLeadBudget(lead, match.price);
                  return (
                    <div key={match.property_id || i} className={`flex items-center justify-between rounded-xl border p-4 ${budgetCheck ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{match.title}</p>
                        <p className="text-xs font-semibold text-slate-400">{[match.city, match.state].filter(Boolean).join(' / ')}</p>
                      </div>
                      <div className="ml-3 flex shrink-0 items-center gap-3">
                        <span className="text-sm font-bold text-emerald-700">{match.price?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' })}</span>
                        {budgetCheck ? <CheckCircle2 size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-400" />}
                        {match.score != null && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">{Math.round(match.score)}%</span>}
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={async () => {
                    const msg = buildMatchWhatsappMessage(lead, matchingProperties);
                    await navigator.clipboard.writeText(msg);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    toast.success('Mensagem copiada!');
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  <Copy size={14} /> {copied ? 'Copiado!' : 'Copiar mensagem de apresentação'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-8">
                <Home size={32} className="text-slate-300" />
                <p className="text-xs font-bold text-slate-400">{loadingMatches ? 'Buscando matches...' : 'Nenhum imóvel encontrado para este perfil.'}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-500">Mover para:</span>
            </div>
            <select
              value={lead.status}
              onChange={(e) => { onStatusChange(lead.id, e.target.value); onClose(); }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none"
            >
              {stages.map((stage) => (<option key={stage.id} value={stage.id}>{stage.label}</option>))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <button
            onClick={() => { onDelete(lead.id, lead.name); onClose(); }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50"
          >
            <Trash2 size={14} /> Excluir lead
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleCopyMessage} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><Copy size={14} /> {copied ? 'Copiado!' : 'Copiar'}</button>
            <button
              onClick={() => openLeadWhatsAppConversation(lead, navigate)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600"
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Helpers & Constants (extracted) ──────────────────────────────────────────
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

// ─── NewStageModal ────────────────────────────────────────────────────────────
const NewStageModal: React.FC<{
  isOpen: boolean;
  existingStages: PipelineStage[];
  onClose: () => void;
  onCreate: (stage: PipelineStage) => void;
}> = ({ isOpen, existingStages, onClose, onCreate }) => {
  const [label, setLabel] = useState('');

  useEffect(() => { if (isOpen) setLabel(''); }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextLabel = normalizeStageId(label);
    if (!nextLabel) { toast.error('Informe o nome da etapa.'); return; }
    const alreadyExists = existingStages.some((s) => s.id.toLocaleLowerCase('pt-BR') === nextLabel.toLocaleLowerCase('pt-BR'));
    if (alreadyExists) { toast.error('Essa etapa ja existe no Kanban.'); return; }
    onCreate({ id: nextLabel, label: nextLabel, icon: LayoutGrid, color: 'bg-slate-100 text-slate-700', custom: true });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Nova etapa</h3>
            <p className="text-xs font-semibold text-slate-400">Adicione outra coluna ao funil.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Nome da etapa</label>
            <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10" placeholder="Ex: Negociacao" maxLength={32} />
          </div>
          <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-indigo-700"><Plus size={16} /> Criar etapa</button>
        </form>
      </div>
    </div>
  );
};

// ─── LeadCard ─────────────────────────────────────────────────────────────────
interface LeadCardProps {
  lead: Lead;
  stages: PipelineStage[];
  selected: boolean;
  onOpen: (lead: Lead) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onMove: (id: string, status: string) => void;
  navigate: (path: string) => void;
}

const LeadCard = React.memo(({
  lead, stages, selected, onOpen, onToggle, onDelete, onMove, navigate,
}: LeadCardProps) => {
  const sla = getSlaInfo(lead);
  const scoreBadge = getScoreBadge(lead.lead_score);
  const displayName = getLeadDisplayName(lead);
  const classification = lead.classification || 'Sem classificacao';
  const phoneDigits = (lead.phone || '').replace(/\D/g, '');
  const phoneLabel = phoneDigits.length > 4 ? phoneDigits.slice(-4).padStart(8, '*') : lead.phone;
  const visibleTags = (lead.tags || []).filter((t) => !String(t).startsWith('intent-')).slice(0, 2);

  return (
    <div onClick={() => onOpen(lead)} className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${selected ? 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/20' : `border-slate-200 ${sla.borderClass}`}`}>
      <div className="flex items-start gap-2.5 p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold uppercase text-slate-700 ring-1 ring-slate-200">
          {getLeadInitials(lead)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 pr-5">
              <h4 className="line-clamp-2 text-[13px] font-bold leading-snug text-slate-950" title={displayName}>{displayName}</h4>
              <p className="mt-0.5 truncate text-[10px] font-bold text-slate-400">{lead.source || 'CRM'}{phoneLabel ? ` \u00B7 ${phoneLabel}` : ''}</p>
            </div>
            {scoreBadge && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ${scoreBadge.bg}`}>{scoreBadge.label} {lead.lead_score}</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="max-w-full truncate rounded-full bg-slate-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">{classification}</span>
            {visibleTags.map((tag) => (
              <span key={tag} className="max-w-[8rem] truncate rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-indigo-600 ring-1 ring-indigo-100">{tag}</span>
            ))}
          </div>
          {lead.property && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
              <Home size={12} className="shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-slate-700">{lead.property.title}</p></div>
              {Number(lead.property.price) > 0 && <span className="shrink-0 text-[10px] font-bold text-emerald-700">{Number(lead.property.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })}</span>}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {sla.label ? (
                <span className={`inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-bold ${sla.labelClass}`}><Clock3 size={10} /> {sla.label}</span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-400"><Clock3 size={10} /> Em dia</span>
              )}
              {lead.next_visit_at && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600"><Calendar size={10} /> Visita</span>}
              {lead.ai_next_action && <span title={lead.ai_next_action} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-indigo-500"><Sparkles size={10} /></span>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={(e) => { e.stopPropagation(); openLeadWhatsAppConversation(lead, navigate); }} className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Abrir WhatsApp"><MessageCircle size={14} /></button>
              <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(lead.id, lead.name); }} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100" title="Excluir"><Trash2 size={13} /></button>
            </div>
          </div>
        </div>
        <label className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-md bg-white/90 opacity-0 shadow-sm ring-1 ring-slate-200 transition-opacity group-hover:opacity-100 has-[:checked]:opacity-100">
          <input type="checkbox" checked={selected} onClick={(e) => e.stopPropagation()} onChange={() => onToggle(lead.id)} className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 text-indigo-600" />
        </label>
      </div>
      <select value={lead.status} onClick={(e) => e.stopPropagation()} onChange={(e) => onMove(lead.id, e.target.value)} className="mx-2.5 mb-2 h-8 w-[calc(100%-1.25rem)] rounded-lg border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 md:hidden">
        {stages.map((stage) => (<option key={stage.id} value={stage.id}>{stage.label}</option>))}
      </select>
    </div>
  );
});
LeadCard.displayName = 'LeadCard';

// ─── KanbanColumn ─────────────────────────────────────────────────────────────
interface KanbanColumnProps {
  stage: PipelineStage; stages: PipelineStage[]; leads: Lead[];
  total: number; selectedIds: Set<string>; hasMore: boolean;
  loadingMore: boolean; onLoadMore: (stageId: string) => void;
  onOpen: (lead: Lead) => void; onToggle: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onMove: (id: string, status: string) => void;
  navigate: (path: string) => void;
}

const KanbanColumn = React.memo(({
  stage, stages, leads, total, selectedIds, hasMore, loadingMore,
  onLoadMore, onOpen, onToggle, onDelete, onMove, navigate,
}: KanbanColumnProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const columnVgv = useMemo(() => {
    const t = leads.reduce((sum, lead) => {
      const price = Number((lead as any).budget || lead.property?.price || 0);
      return sum + (Number.isFinite(price) ? price : 0);
    }, 0);
    return t > 0 ? t.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }) : null;
  }, [leads]);

  const virtualizer = useVirtualizer({
    count: leads.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 112,
    overscan: 4,
    getItemKey: (index) => leads[index]?.id || index,
  });

  const renderDraggable = (lead: Lead, provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={snapshot.isDragging ? 'rotate-1 opacity-95 shadow-xl' : ''}>
      <LeadCard lead={lead} stages={stages} selected={selectedIds.has(lead.id)} onOpen={onOpen} onToggle={onToggle} onDelete={onDelete} onMove={onMove} navigate={navigate} />
    </div>
  );

  return (
    <Droppable droppableId={stage.id} mode="virtual" renderClone={(provided, snapshot, rubric) => renderDraggable(leads[rubric.source.index], provided, snapshot)}>
      {(provided, snapshot) => (
        <section id={`kanban-stage-${stage.id}`} className={`flex h-full min-w-[17rem] flex-col overflow-hidden rounded-xl border border-slate-200 ${snapshot.isDraggingOver ? 'bg-indigo-50/70 ring-2 ring-indigo-200' : 'bg-slate-50'}`}>
          <header className="border-b border-slate-200 bg-white px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold uppercase ${stage.color}`}><stage.icon size={11} /> {stage.label}</span>
              <span className="text-[11px] font-bold text-slate-500">{total}</span>
            </div>
            {columnVgv && <p className="mt-1.5 text-[10px] font-semibold text-slate-400">VGV <span className="font-bold text-slate-600">{columnVgv}</span></p>}
          </header>
          <div ref={(el) => { scrollRef.current = el; provided.innerRef(el); }} {...provided.droppableProps} className="h-[calc(100vh-18rem)] min-h-[28rem] overflow-y-auto p-2">
            <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const l = leads[virtualRow.index];
                return (
                  <div key={l.id} data-index={virtualRow.index} ref={virtualizer.measureElement} className="pb-3" style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}>
                    <Draggable draggableId={l.id} index={virtualRow.index}>{(dragProvided, dragSnapshot) => renderDraggable(l, dragProvided, dragSnapshot)}</Draggable>
                  </div>
                );
              })}
            </div>
            {hasMore && <button type="button" onClick={() => onLoadMore(stage.id)} disabled={loadingMore} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white text-[10px] font-bold uppercase text-slate-600 disabled:opacity-50">{loadingMore ? 'Carregando...' : 'Carregar mais'}</button>}
          </div>
        </section>
      )}
    </Droppable>
  );
});
KanbanColumn.displayName = 'KanbanColumn';

// ─── Main KanbanBoard ─────────────────────────────────────────────────────────
const KanbanBoard: React.FC = () => {
  const matchProfile: 'urbano' | 'rural' = window.location.pathname.startsWith('/rural') ? 'rural' : 'urbano';
  const navigate = useNavigate();
  const [customStages, setCustomStages] = useState<PipelineStage[]>(() => loadCustomStages(matchProfile));
  const pipelineStages = useMemo(() => [...PIPELINE_STAGES, ...customStages], [customStages]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stageState, setStageState] = useState<StagePageState>(() => createEmptyStageState(pipelineStages));
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [mobileStageId, setMobileStageId] = useState(pipelineStages[0].id);
  const [intentFilter, setIntentFilter] = useState<IntentFilter>('todos');

  const { profile, isImpersonating } = useAuth();
  const isSuperAdmin = profile?.role === 'superadmin';
  const targetOrgId = isSuperAdmin && !isImpersonating ? undefined : profile?.organization_id;

  useEffect(() => { setCustomStages(loadCustomStages(matchProfile)); setMobileStageId(PIPELINE_STAGES[0].id); }, [matchProfile]);

  const handleCreateStage = useCallback((stage: PipelineStage) => {
    setCustomStages((prev) => { const next = [...prev, stage]; saveCustomStages(matchProfile, next); return next; });
    setStageState((prev) => ({ ...prev, [stage.id]: { nextCursor: null, hasMore: false, total: 0, loadingMore: false } }));
    setMobileStageId(stage.id);
    toast.success('Etapa criada no Kanban.');
  }, [matchProfile]);

  const loadLeads = useCallback(async () => {
    if (!targetOrgId) return;
    try {
      setLoading(true);
      const intent = intentFilter === 'todos' ? null : intentFilter;
      const pages = await Promise.all(pipelineStages.map((stage) => leadService.listPage({ status: stage.id, intent, limit: 50, includeCount: true })));
      setLeads(pages.flatMap((page) => page.leads));
      setStageState(Object.fromEntries(pipelineStages.map((stage, index) => [stage.id, { nextCursor: pages[index].nextCursor, hasMore: pages[index].hasMore, total: pages[index].total, loadingMore: false }])));
    } catch (error: any) {
      logger.error('Failed to load Kanban leads', error);
      toast.error('Erro ao carregar leads: ' + error.message);
    } finally { setLoading(false); }
  }, [targetOrgId, intentFilter, pipelineStages]);

  useEffect(() => {
    if (!targetOrgId) { setLeads([]); setStageState(createEmptyStageState(pipelineStages)); setLoading(false); return; }
    loadLeads();
  }, [loadLeads, pipelineStages, targetOrgId]);

  const loadMoreStage = useCallback(async (stageId: string) => {
    const current = stageState[stageId];
    if (!current?.hasMore || !current.nextCursor || current.loadingMore) return;
    setStageState((prev) => ({ ...prev, [stageId]: { ...prev[stageId], loadingMore: true } }));
    try {
      const page = await leadService.listPage({
        status: stageId, cursor: current.nextCursor,
        intent: intentFilter === 'todos' ? null : intentFilter, limit: 50, includeCount: false,
      });
      setLeads((prev) => [...prev, ...page.leads]);
      setStageState((prev) => ({ ...prev, [stageId]: { ...prev[stageId], nextCursor: page.nextCursor, hasMore: page.hasMore, loadingMore: false } }));
    } catch (error) { logger.error('Failed to load more leads', error); setStageState((prev) => ({ ...prev, [stageId]: { ...prev[stageId], loadingMore: false } })); }
  }, [stageState, intentFilter]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || result.source.droppableId === result.destination.droppableId) return;
    const leadId = result.draggableId;
    const newStatus = result.destination.droppableId;
    leadService.update(leadId, { status: newStatus } as any).catch((error) => { logger.error('Failed to move lead', error); toast.error('Erro ao mover lead'); });
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
  }, []);

  const handleStatusChange = useCallback((leadId: string, newStatus: string) => {
    leadService.update(leadId, { status: newStatus } as any).catch((error) => logger.error('Failed to update lead status', error));
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (!selectedLeadIds.length || !window.confirm(`Excluir ${selectedLeadIds.length} lead(s) permanentemente?`)) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedLeadIds.map((id) => leadService.delete(id)));
      setLeads((prev) => prev.filter((l) => !selectedLeadIds.includes(l.id)));
      setSelectedLeadIds([]);
      toast.success(`${selectedLeadIds.length} lead(s) excluído(s).`);
    } catch (error) { logger.error('Bulk delete failed', error); toast.error('Erro ao excluir leads'); }
    finally { setIsBulkDeleting(false); }
  }, [selectedLeadIds]);

  const handleDelete = useCallback((id: string, name: string) => {
    if (!window.confirm(`Excluir lead "${name || id}" permanentemente?`)) return;
    leadService.delete(id).then(() => setLeads((prev) => prev.filter((l) => l.id !== id))).catch((error) => { logger.error('Failed to delete lead', error); toast.error('Erro ao excluir lead'); });
  }, []);

  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads;
    const term = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return leads.filter((l) =>
      [l.name, l.phone, l.email, l.classification, l.source, l.notes, ...(l.tags || [])]
        .filter(Boolean).some((field) => String(field).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term))
    );
  }, [leads, searchTerm]);

  const stageLeadMap = useMemo(() => {
    const map = new Map<string, Lead[]>();
    pipelineStages.forEach((s) => map.set(s.id, []));
    filteredLeads.forEach((l) => { const col = map.get(l.status); if (col) col.push(l); });
    return map;
  }, [filteredLeads, pipelineStages]);

  const selectedIdsSet = useMemo(() => new Set(selectedLeadIds), [selectedLeadIds]);

  const currentSort = 'status'; // sempre ordenado por status (coluna)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9 w-56 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10" placeholder="Buscar leads..." />
          </div>
          <div className="hidden items-center gap-1 rounded-xl bg-slate-100 p-1 md:flex">
            {INTENT_FILTERS.map((f) => (
              <button key={f.id} onClick={() => setIntentFilter(f.id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${intentFilter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <f.icon size={12} /> {f.shortLabel}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedLeadIds.length > 0 && (
            <button onClick={handleBulkDelete} disabled={isBulkDeleting} className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-100 disabled:opacity-50">
              <Trash2 size={13} /> Excluir {selectedLeadIds.length}
            </button>
          )}
          <button onClick={() => setIsStageModalOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-200">
            <LayoutGrid size={13} /> Etapas
          </button>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700">
            <Plus size={14} /> Novo Lead
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center"><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-slate-600"></div><p className="text-xs font-bold text-slate-400">Carregando leads...</p></div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-x-auto p-4 md:p-6">
          {/* Mobile: select de coluna + leads filtrados */}
          <div className="flex w-full flex-col gap-3 md:hidden">
            <select value={mobileStageId} onChange={(e) => setMobileStageId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800">
              {pipelineStages.map((s) => (<option key={s.id} value={s.id}>{s.label} ({stageLeadMap.get(s.id)?.length || 0})</option>))}
            </select>
            <div className="space-y-2">
              {(stageLeadMap.get(mobileStageId) || []).map((lead) => (
                <LeadCard key={lead.id} lead={lead} stages={pipelineStages} selected={selectedIdsSet.has(lead.id)} onOpen={(l) => { setSelectedLead(l); setIsDetailsOpen(true); }} onToggle={(id) => setSelectedLeadIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])} onDelete={handleDelete} onMove={handleStatusChange} navigate={navigate} />
              ))}
            </div>
          </div>

          {/* Desktop: Kanban columns */}
          <div className="hidden md:flex md:gap-4">
            <DragDropContext onDragEnd={handleDragEnd}>
              {pipelineStages.map((stage) => {
                const columnLeads = stageLeadMap.get(stage.id) || [];
                const state = stageState[stage.id];
                return (
                  <KanbanColumn
                    key={stage.id} stage={stage} stages={pipelineStages}
                    leads={columnLeads} total={state?.total ?? columnLeads.length}
                    selectedIds={selectedIdsSet} hasMore={state?.hasMore ?? false}
                    loadingMore={state?.loadingMore ?? false}
                    onLoadMore={loadMoreStage} onOpen={(l) => { setSelectedLead(l); setIsDetailsOpen(true); }}
                    onToggle={(id) => setSelectedLeadIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
                    onDelete={handleDelete} onMove={handleStatusChange} navigate={navigate}
                  />
                );
              })}
            </DragDropContext>
          </div>
        </div>
      )}

      <NewLeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={loadLeads} orgId={targetOrgId} matchProfile={matchProfile} />
      <LeadDetailsModal isOpen={isDetailsOpen} lead={selectedLead} onClose={() => setIsDetailsOpen(false)} onStatusChange={handleStatusChange} onDelete={handleDelete} stages={pipelineStages} navigate={navigate} />
      <EditLeadModal isOpen={isEditOpen} lead={selectedLead} onClose={() => setIsEditOpen(false)} onSaved={(updated) => setLeads((prev) => prev.map((l) => l.id === updated.id ? updated : l))} />
      <NewStageModal isOpen={isStageModalOpen} existingStages={pipelineStages} onClose={() => setIsStageModalOpen(false)} onCreate={handleCreateStage} />
    </div>
  );
};

export default KanbanBoard;
