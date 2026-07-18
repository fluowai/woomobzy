import React from 'react';
import {
  MessageCircle, Phone, Clock3, Home, Trash2, Sparkles, Calendar,
} from 'lucide-react';
import { Lead } from '../../../types';
import { PipelineStage } from '../kanban/constants';
import {
  getLeadDisplayName, getLeadInitials, getSlaInfo, getScoreBadge,
  openLeadWhatsAppConversation,
} from '../kanban/helpers';
import { useNavigate } from 'react-router-dom';

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

export default LeadCard;
