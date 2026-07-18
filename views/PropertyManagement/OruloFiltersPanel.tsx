import React from 'react';
import { X } from 'lucide-react';

interface OruloFilters {
  state: string;
  city: string;
  areas: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  parking: string;
  status: string;
  portfolio: string;
  maxBuildings: string;
}

interface OruloFiltersPanelProps {
  filters: OruloFilters;
  onUpdate: (key: keyof OruloFilters, value: string) => void;
  onReset: () => void;
}

const OruloFiltersPanel: React.FC<OruloFiltersPanelProps> = ({
  filters,
  onUpdate,
  onReset,
}) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800">
          Importacao Orulo por regiao
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          UF e cidade filtram o catalogo antes de trazer as fichas para revisao.
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="text-xs font-bold text-slate-500 hover:text-slate-900"
      >
        Limpar
      </button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      <input
        value={filters.state}
        onChange={(e) => onUpdate('state', e.target.value)}
        placeholder="UF ex: SP"
        maxLength={2}
        className="input-field"
      />
      <input
        value={filters.city}
        onChange={(e) => onUpdate('city', e.target.value)}
        placeholder="Cidade"
        className="input-field"
      />
      <input
        value={filters.areas}
        onChange={(e) => onUpdate('areas', e.target.value)}
        placeholder="Bairros separados por virgula"
        className="input-field sm:col-span-2 xl:col-span-1"
      />
      <input
        type="number"
        value={filters.minPrice}
        onChange={(e) => onUpdate('minPrice', e.target.value)}
        placeholder="Valor minimo"
        className="input-field"
      />
      <input
        type="number"
        value={filters.maxPrice}
        onChange={(e) => onUpdate('maxPrice', e.target.value)}
        placeholder="Valor maximo"
        className="input-field"
      />
      <select
        value={filters.bedrooms}
        onChange={(e) => onUpdate('bedrooms', e.target.value)}
        className="input-field"
      >
        <option value="">Dormitorios</option>
        <option value="1">1 dorm.</option>
        <option value="2">2 dorm.</option>
        <option value="3">3 dorm.</option>
        <option value="4+">4+ dorm.</option>
      </select>
      <select
        value={filters.parking}
        onChange={(e) => onUpdate('parking', e.target.value)}
        className="input-field"
      >
        <option value="">Vagas</option>
        <option value="1">1 vaga</option>
        <option value="2">2 vagas</option>
        <option value="3+">3+ vagas</option>
      </select>
      <select
        value={filters.status}
        onChange={(e) => onUpdate('status', e.target.value)}
        className="input-field"
      >
        <option value="">Status obra</option>
        <option value="under_construction">Em construcao</option>
        <option value="ready">Pronto novo</option>
        <option value="used">Usado</option>
      </select>
      <select
        value={filters.portfolio}
        onChange={(e) => onUpdate('portfolio', e.target.value)}
        className="input-field"
      >
        <option value="">Carteira</option>
        <option value="new_development">Lancamento</option>
        <option value="exchange">Dacao</option>
        <option value="exclusivity">Exclusividade</option>
      </select>
      <input
        type="number"
        min={1}
        max={100}
        value={filters.maxBuildings}
        onChange={(e) => onUpdate('maxBuildings', e.target.value)}
        placeholder="Limite"
        className="input-field"
      />
    </div>
  </div>
);

export default OruloFiltersPanel;
