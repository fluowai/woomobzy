import React from 'react';
import {
  MessageCircle,
  Search,
  Calendar,
  FileCheck,
  Clock3,
  CheckCircle2,
  XCircle,
  User,
  LayoutGrid,
  Target,
  Home,
  Building2,
} from 'lucide-react';

export type IntentFilter = 'todos' | 'comprador' | 'vendedor' | 'parceria';

export type PipelineStage = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  custom?: boolean;
};

export type StagePageState = Record<
  string,
  {
    nextCursor: { created_at: string; id: string } | null;
    hasMore: boolean;
    total: number;
    loadingMore: boolean;
  }
>;

export const PIPELINE_STAGES: PipelineStage[] = [
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
  {
    id: 'Pessoal',
    label: 'Pessoal',
    icon: User,
    color: 'bg-slate-100 text-slate-700',
  },
];

export const INTENT_FILTERS: Array<{
  id: IntentFilter;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: 'todos',
    label: 'Todos os leads',
    shortLabel: 'Todos',
    description: 'Funil completo',
    icon: LayoutGrid,
  },
  {
    id: 'comprador',
    label: 'Compradores de fazenda',
    shortLabel: 'Compradores',
    description: 'Quem busca comprar',
    icon: Target,
  },
  {
    id: 'vendedor',
    label: 'Vendedores de fazenda',
    shortLabel: 'Vendedores',
    description: 'Proprietarios que querem vender',
    icon: Home,
  },
  {
    id: 'parceria',
    label: 'Corretores / parcerias',
    shortLabel: 'Parcerias',
    description: 'Corretores e ofertas de terceiros',
    icon: Building2,
  },
];

export const createEmptyStageState = (
  stages: PipelineStage[]
): StagePageState =>
  Object.fromEntries(
    stages.map((stage) => [
      stage.id,
      { nextCursor: null, hasMore: false, total: 0, loadingMore: false },
    ])
  );
