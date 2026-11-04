import React, { useEffect, useState } from 'react';
import { Building2, Search, Home, MapPin } from 'lucide-react';
import type { Lease } from '../../../types/lease';
import { supabase } from '../../../../services/supabase';

interface Props {
  lease: Partial<Lease>;
  updateField: <K extends keyof Lease>(key: K, value: Lease[K]) => void;
  updateFields: (fields: Partial<Lease>) => void;
}

const inputClass = 'w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all';
const labelClass = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest';

export const StepProperty: React.FC<Props> = ({ lease, updateField }) => {
  const [properties, setProperties] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    const { data } = await supabase
      .from('properties')
      .select('id, title, city, state, address, neighborhood, price, property_type')
      .eq('status', 'Disponível')
      .order('title');
    setProperties(data || []);
  };

  const filtered = properties.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.neighborhood?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProperty = properties.find(p => p.id === lease.property_id);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Busca */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Building2 size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Selecionar Imóvel</h4>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            placeholder="Buscar por nome, cidade ou bairro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => updateField('property_id', p.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                lease.property_id === p.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <p className="font-bold text-sm text-slate-800">{p.title}</p>
              <p className="text-xs text-slate-400 mt-1">
                {p.neighborhood && `${p.neighborhood} - `}{p.city}/{p.state}
              </p>
              <p className="text-xs font-bold text-blue-600 mt-1">
                R$ {p.price?.toLocaleString('pt-BR')}
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-slate-400 italic md:col-span-2 py-8 text-center">
              Nenhum imóvel disponível encontrado
            </p>
          )}
        </div>
      </section>

      {/* Detalhes do Imóvel Selecionado */}
      {selectedProperty && (
        <>
          <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><MapPin size={20} /></div>
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Detalhes do Imóvel</h4>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="font-bold text-lg text-slate-800">{selectedProperty.title}</p>
              <p className="text-sm text-slate-500">
                {selectedProperty.address && `${selectedProperty.address}, `}
                {selectedProperty.neighborhood && `${selectedProperty.neighborhood} - `}
                {selectedProperty.city}/{selectedProperty.state}
              </p>
              <p className="text-sm font-bold text-blue-600 mt-2">
                {selectedProperty.property_type} - R$ {selectedProperty.price?.toLocaleString('pt-BR')}
              </p>
            </div>
          </section>

          {/* Utilidades e Encargos */}
          <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Home size={20} /></div>
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Utilidades e Encargos</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Condomínio (R$)</label>
                <input
                  type="number"
                  value={lease.condominium_fee || ''}
                  onChange={(e) => updateField('condominium_fee', Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>IPTU (R$)</label>
                <input
                  type="number"
                  value={lease.iptu_amount || ''}
                  onChange={(e) => updateField('iptu_amount', Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Finalidade</label>
                <select
                  value={lease.rental_purpose || 'residencial'}
                  onChange={(e) => updateField('rental_purpose', e.target.value)}
                  className={inputClass}
                >
                  <option value="residencial">Residencial</option>
                  <option value="comercial">Comercial</option>
                </select>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
