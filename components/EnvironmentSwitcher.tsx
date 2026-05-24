import React from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { useEnvironment, EnvironmentType } from '../context/EnvironmentContext';

const labels: Record<EnvironmentType, string> = {
  urban: 'Imobzy Urbana',
  rural: 'Imobzy Rural',
};

const oppositeType = (type: EnvironmentType | null): EnvironmentType => (type === 'rural' ? 'urban' : 'rural');

const EnvironmentSwitcher: React.FC = () => {
  const {
    activeEnvironment,
    activeEnvironmentType,
    environments,
    loading,
    switchEnvironment,
  } = useEnvironment();

  const nextType = oppositeType(activeEnvironmentType);
  const hasNext = environments.some((environment) => environment.type === nextType);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="hidden min-w-0 sm:block">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Voce esta em</p>
        <p className="truncate text-xs font-black text-slate-900">
          {activeEnvironment?.name || 'Ambiente'}
        </p>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={() => switchEnvironment(nextType)}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-black text-white transition hover:bg-slate-700 disabled:opacity-60"
        title={hasNext ? `Trocar para ${labels[nextType]}` : `Ativar ${labels[nextType]}`}
      >
        {hasNext ? <RefreshCw size={15} /> : <ChevronDown size={15} />}
        <span className="hidden md:inline">{hasNext ? `Trocar para ${labels[nextType].replace('Imobzy ', '')}` : `Ativar ${labels[nextType].replace('Imobzy ', '')}`}</span>
      </button>
    </div>
  );
};

export default EnvironmentSwitcher;
