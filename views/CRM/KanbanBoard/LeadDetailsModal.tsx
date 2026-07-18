import React, { useEffect, useState } from 'react';
import {
  MessageCircle,
  Phone,
  Mail,
  Home,
  Trash2,
  Copy,
  Tag,
  CheckCircle2,
  XCircle,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../services/supabase';
import { Lead } from '../../../types';
import { PipelineStage } from '../kanban/constants';
import {
  getLeadDisplayName,
  getLeadInitials,
  getSlaInfo,
  openLeadWhatsAppConversation,
  isWithinLeadBudget,
} from '../kanban/helpers';

interface LeadDetailsModalProps {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string, name: string) => void;
  stages: PipelineStage[];
  navigate: (path: string) => void;
}

const buildMatchWhatsappMessage = (lead: Lead, matches: any[]) => {
  const firstName = lead.name?.split(' ')[0] || 'tudo bem';
  if (!matches.length) {
    return `Olá ${firstName}, estou analisando novas opções para o seu perfil e te aviso assim que encontrar imóveis realmente aderentes.`;
  }
  return [
    `Olá ${firstName}, encontrei alguns imóveis que combinam com o seu perfil.`,
    '',
    ...matches
      .slice(0, 3)
      .flatMap((match, index) =>
        [
          `${index + 1}. ${match.title}`,
          match.city || match.state
            ? `- ${[match.city, match.state].filter(Boolean).join(' / ')}`
            : null,
          match.price
            ? `- ${match.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
            : null,
          ...(match.reasons || [])
            .slice(0, 2)
            .map((reason: string) => `- ${reason}`),
          '',
        ].filter(Boolean)
      ),
    'Posso te enviar mais detalhes?',
  ].join('\n');
};

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  lead,
  onClose,
  onStatusChange,
  onDelete,
  stages,
  navigate,
}) => {
  const [matchingProperties, setMatchingProperties] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !lead?.id) return;
    setMatchingProperties([]);
    setLoadingMatches(true);
    const fetchMatches = async () => {
      try {
        const { data } = await supabase.rpc('match_properties_to_lead', {
          lead_id: lead.id,
          max_results: 5,
        });
        setMatchingProperties(data || []);
      } catch {
        /* silencio */
      }
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
              {getLeadInitials(lead)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                {getLeadDisplayName(lead)}
              </h2>
              <p className="text-xs font-semibold text-slate-400">
                {lead.classification || 'Sem classificação'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Telefone
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Phone size={14} className="text-slate-400" />
                <a
                  href={`tel:${lead.phone}`}
                  className="text-sm font-bold text-slate-800 hover:text-indigo-600"
                >
                  {lead.phone || '-'}
                </a>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Email
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Mail size={14} className="text-slate-400" />
                <span className="truncate text-sm font-bold text-slate-800">
                  {lead.email || '-'}
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Origem
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {lead.source || '-'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Status
              </p>
              <span
                className={`mt-1 inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase ${stages.find((s) => s.id === lead.status)?.color || 'bg-slate-100 text-slate-600'}`}
              >
                {lead.status}
              </span>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Score
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {lead.lead_score ?? '-'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                SLA
              </p>
              <p className={`mt-1 text-sm font-bold ${sla.labelClass}`}>
                {sla.label || 'Em dia'}
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Observações
            </h4>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="whitespace-pre-wrap text-sm font-semibold text-slate-700">
                {lead.notes || 'Nenhuma observação.'}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Imóveis recomendados
              </h4>
              {lead.id && (
                <button
                  onClick={async () => {
                    setLoadingMatches(true);
                    const { data } = await supabase.rpc(
                      'match_properties_to_lead',
                      { lead_id: lead.id, max_results: 5 }
                    );
                    setMatchingProperties(data || []);
                    setLoadingMatches(false);
                  }}
                  className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-600"
                  disabled={loadingMatches}
                >
                  <Sparkles size={12} />{' '}
                  {loadingMatches ? 'Analisando...' : 'Atualizar matches'}
                </button>
              )}
            </div>
            {matchingProperties.length > 0 ? (
              <div className="space-y-2">
                {matchingProperties.map((match, i) => {
                  const budgetCheck = isWithinLeadBudget(lead, match.price);
                  return (
                    <div
                      key={match.property_id || i}
                      className={`flex items-center justify-between rounded-xl border p-4 ${budgetCheck ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {match.title}
                        </p>
                        <p className="text-xs font-semibold text-slate-400">
                          {[match.city, match.state]
                            .filter(Boolean)
                            .join(' / ')}
                        </p>
                      </div>
                      <div className="ml-3 flex shrink-0 items-center gap-3">
                        <span className="text-sm font-bold text-emerald-700">
                          {match.price?.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            notation: 'compact',
                          })}
                        </span>
                        {budgetCheck ? (
                          <CheckCircle2
                            size={16}
                            className="text-emerald-500"
                          />
                        ) : (
                          <XCircle size={16} className="text-red-400" />
                        )}
                        {match.score != null && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                            {Math.round(match.score)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={async () => {
                    const msg = buildMatchWhatsappMessage(
                      lead,
                      matchingProperties
                    );
                    await navigator.clipboard.writeText(msg);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    toast.success('Mensagem copiada!');
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  <Copy size={14} />{' '}
                  {copied ? 'Copiado!' : 'Copiar mensagem de apresentação'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-8">
                <Home size={32} className="text-slate-300" />
                <p className="text-xs font-bold text-slate-400">
                  {loadingMatches
                    ? 'Buscando matches...'
                    : 'Nenhum imóvel encontrado para este perfil.'}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-500">
                Mover para:
              </span>
            </div>
            <select
              value={lead.status}
              onChange={(e) => {
                onStatusChange(lead.id, e.target.value);
                onClose();
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none"
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <button
            onClick={() => {
              onDelete(lead.id, lead.name);
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50"
          >
            <Trash2 size={14} /> Excluir lead
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMessage}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <Copy size={14} /> {copied ? 'Copiado!' : 'Copiar'}
            </button>
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

export default LeadDetailsModal;
