import React from 'react';

interface StatusBadgeProps {
  status: string;
  compact?: boolean;
}

const styles: Record<string, string> = {
  Ativo: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  'Em teste': 'border-amber-100 bg-amber-50 text-amber-700',
  Rascunho: 'border-slate-200 bg-slate-50 text-slate-500',
  Pausado: 'border-slate-200 bg-slate-50 text-slate-500',
};

const dotColors: Record<string, string> = {
  Ativo: 'bg-emerald-500',
  'Em teste': 'bg-amber-500',
  Rascunho: 'bg-amber-500',
  Pausado: 'bg-slate-400',
};

export const AgentStatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  compact,
}) => {
  const s = styles[status] || styles.Rascunho;
  const d = dotColors[status] || dotColors.Rascunho;
  return (
    <span
      className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold ${s}`}
    >
      <span className={`h-2 w-2 rounded-full ${d}`} />
      {compact ? status : `Agente ${status.toLowerCase()}`}
    </span>
  );
};
