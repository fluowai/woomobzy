import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, FileCheck, FileSearch, Map as MapIcon, Navigation } from 'lucide-react';

const tabs = [
  {
    icon: MapIcon,
    label: 'Mapas',
    description: 'Georreferenciamento e camadas territoriais',
    path: '/rural/territorio/maps',
  },
  {
    icon: Navigation,
    label: 'Localizar CAR',
    description: 'Busca automática por coordenadas e município',
    path: '/rural/territorio/localizar-car',
  },
  {
    icon: BarChart3,
    label: 'Valuation',
    description: 'Consulta pós-CAR e valor referencial',
    path: '/rural/territorio/valuation',
  },
  {
    icon: FileSearch,
    label: 'Dossiê 360',
    description: 'Análise consolidada do ativo rural',
    path: '/rural/territorio/dossie',
  },
  {
    icon: FileCheck,
    label: 'Documentação',
    description: 'Due diligence e pendências documentais',
    path: '/rural/territorio/due-diligence',
  },
];

const RuralTerritoryHub: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-small font-bold text-primary uppercase tracking-widest">
          Inteligência Territorial
        </p>
        <h1 className="h1">Território Rural</h1>
        <p className="body text-text-secondary max-w-3xl">
          Mapas, CAR, valuation, dossiê e documentação trabalham juntos para qualificar o imóvel rural em um único fluxo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `p-4 rounded-2xl border transition-all group ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                  : 'bg-bg-card border-border-subtle text-text-secondary hover:border-primary/30 hover:text-primary'
              }`
            }
          >
            {({ isActive }) => (
              <div className="space-y-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    isActive
                      ? 'bg-white/15 border-white/20 text-white'
                      : 'bg-primary/5 border-primary/10 text-primary'
                  }`}
                >
                  <tab.icon size={20} />
                </div>
                <div>
                  <p className={`text-sm font-black ${isActive ? 'text-white' : 'text-text-primary'}`}>
                    {tab.label}
                  </p>
                  <p className={`text-[11px] leading-relaxed mt-1 ${isActive ? 'text-white/75' : 'text-text-tertiary'}`}>
                    {tab.description}
                  </p>
                </div>
              </div>
            )}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
};

export default RuralTerritoryHub;
