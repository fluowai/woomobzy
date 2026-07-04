import { logger } from '@/utils/logger';
import { Lead } from '../../../types';
import { PipelineStage } from './constants';
import { toast } from 'sonner';
import { chatApi, instanceApi } from '../../WhatsApp/hooks/api';
import { LayoutGrid } from 'lucide-react';

export const buildMatchWhatsappMessage = (lead: Lead, matches: any[]) => {
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

export const getLeadDisplayName = (lead: Lead) => {
  const name = (lead.name || '').trim();
  if (name && name !== '~') return name;
  const phone = (lead.phone || '').replace(/\D/g, '');
  return phone || 'Lead sem nome';
};

export const getLeadInitials = (lead: Lead) => {
  const displayName = getLeadDisplayName(lead);
  const parts = displayName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return displayName.slice(0, 2).toUpperCase();
};

export const parseMoneyValue = (rawNumber?: string, rawUnit?: string) => {
  if (!rawNumber) return null;
  const value = Number(rawNumber.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(value)) return null;
  const unit = (rawUnit || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (['milhao', 'milhoes', 'mi', 'm'].includes(unit)) return value * 1_000_000;
  if (unit === 'mil') return value * 1_000;
  return value;
};

export const extractLeadBudgetRange = (lead: Lead) => {
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

export const isWithinLeadBudget = (lead: Lead, price?: number) => {
  const value = Number(price || 0);
  if (!value) return true;
  const budget = extractLeadBudgetRange(lead);
  if (budget.max && value > budget.max) return false;
  if (budget.min && value < budget.min) return false;
  return true;
};

export const getSlaInfo = (lead: Lead): { borderClass: string; label: string; labelClass: string } => {
  const ref = (lead as any).last_interaction_at || lead.createdAt;
  if (!ref) return { borderClass: 'border-slate-200', label: '', labelClass: '' };
  const hours = (Date.now() - new Date(ref).getTime()) / 3_600_000;
  if (hours > 48) return {
    borderClass: 'border-l-[3px] border-l-red-500',
    label: `${Math.floor(hours)}h`,
    labelClass: 'text-red-500',
  };
  if (hours > 24) return {
    borderClass: 'border-l-[3px] border-l-amber-400',
    label: `${Math.floor(hours)}h`,
    labelClass: 'text-amber-500',
  };
  return {
    borderClass: 'border-l-[3px] border-l-emerald-400',
    label: `${Math.floor(hours)}h`,
    labelClass: 'text-emerald-600',
  };
};

export const getLeadWhatsAppFallbackUrl = (lead: Lead) =>
  `https://wa.me/${(lead.phone || '').replace(/\D/g, '')}`;

export const openLeadWhatsAppConversation = async (lead: Lead, navigate: (path: string) => void) => {
  if (lead.phone) {
    try {
      const instances = await instanceApi.list();
      const instance = instances.find((item: any) => item.status === 'connected') || instances[0];
      if (instance?.id) {
        const chat = await chatApi.ensureDirect(instance.id, {
          phone: lead.phone,
          name: getLeadDisplayName(lead),
        });
        const params = new URLSearchParams({ instanceId: instance.id, chatId: chat.id, chatJid: chat.chat_jid });
        navigate(`/whatsapp?${params.toString()}`);
        return;
      }
    } catch (error) {
      logger.warn('Failed to open internal WhatsApp chat', error);
    }
  }
  if (lead.chat_jid) {
    navigate(`/whatsapp?chatJid=${encodeURIComponent(lead.chat_jid)}`);
    return;
  }
  if (lead.phone) {
    window.open(getLeadWhatsAppFallbackUrl(lead), '_blank');
  } else {
    toast.error('Este lead nao possui telefone cadastrado.');
  }
};

export const getScoreBadge = (score?: number | null) => {
  if (!score) return null;
  if (score >= 80) return { label: 'Alto', bg: 'bg-orange-50 text-orange-600 ring-orange-100' };
  if (score >= 60) return { label: 'Bom', bg: 'bg-emerald-50 text-emerald-700 ring-emerald-100' };
  if (score >= 40) return { label: 'Medio', bg: 'bg-amber-50 text-amber-700 ring-amber-100' };
  return { label: 'Baixo', bg: 'bg-slate-100 text-slate-500 ring-slate-200' };
};

export const getCustomStageStorageKey = (profile: 'urbano' | 'rural') =>
  `imobzy:crm:${profile}:custom-kanban-stages`;

export const normalizeStageId = (label: string) =>
  label.trim().replace(/\s+/g, ' ').slice(0, 32);

export const loadCustomStages = (profile: 'urbano' | 'rural'): PipelineStage[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = window.localStorage.getItem(getCustomStageStorageKey(profile));
    const parsed = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((stage: any) => ({
        id: String(stage.id || '').trim(),
        label: String(stage.label || stage.id || '').trim(),
        icon: LayoutGrid,
        color: 'bg-slate-100 text-slate-700',
        custom: true,
      }))
      .filter((stage: PipelineStage) => stage.id && stage.label);
  } catch {
    return [];
  }
};

export const saveCustomStages = (profile: 'urbano' | 'rural', stages: PipelineStage[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    getCustomStageStorageKey(profile),
    JSON.stringify(stages.map(({ id, label }) => ({ id, label })))
  );
};
