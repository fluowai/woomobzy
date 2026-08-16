import React, { useState, useCallback } from 'react';
import { User, Mail, Phone, Calendar, MapPin, Plus, X, Users } from 'lucide-react';
import type { Lease } from '../../../types/lease';
import { useCep } from '../../../hooks/lease/useCep';

interface Props {
  lease: Partial<Lease>;
  updateField: <K extends keyof Lease>(key: K, value: Lease[K]) => void;
  updateFields: (fields: Partial<Lease>) => void;
}

const inputClass = 'w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all';
const labelClass = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest';

export const StepTenantData: React.FC<Props> = ({ lease, updateField, updateFields }) => {
  const { fetchCep, loading: cepLoading } = useCep();
  const [coTenants, setCoTenants] = useState<Array<{name: string; cpf: string}>>([]);

  const handleCepBlur = useCallback(async (cep: string) => {
    const result = await fetchCep(cep);
    if (result) {
      updateFields({
        tenant_address_zip: cep,
        tenant_address_street: result.logradouro,
        tenant_address_neighborhood: result.bairro,
        tenant_city: result.cidade,
        tenant_state: result.uf,
      });
    }
  }, [fetchCep, updateFields]);

  const addCoTenant = () => {
    setCoTenants([...coTenants, { name: '', cpf: '' }]);
  };

  const removeCoTenant = (idx: number) => {
    setCoTenants(coTenants.filter((_, i) => i !== idx));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Tipo de Pessoa */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><User size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Tipo de Pessoa</h4>
        </div>
        <div className="flex gap-3">
          {(['PF', 'PJ'] as const).map((type) => (
            <button
              key={type}
              onClick={() => updateField('tenant_type', type)}
              className={`flex-1 py-4 rounded-xl font-bold text-sm transition-all ${
                lease.tenant_type === type
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
            </button>
          ))}
        </div>
      </section>

      {/* Dados Principais */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><User size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">
            Dados do {lease.tenant_type === 'PJ' ? 'Representante Legal' : 'Locatário'}
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Nome completo</label>
            <input
              value={lease.tenant_name || ''}
              onChange={(e) => updateField('tenant_name', e.target.value)}
              className={inputClass}
              placeholder="Nome do locatário"
            />
          </div>
          <div>
            <label className={labelClass}>{lease.tenant_type === 'PJ' ? 'CNPJ' : 'CPF'}</label>
            <input
              value={lease.tenant_cpf || ''}
              onChange={(e) => updateField('tenant_cpf', e.target.value)}
              className={inputClass}
              placeholder="000.000.000-00"
              maxLength={18}
            />
          </div>
          <div>
            <label className={labelClass}>RG</label>
            <input
              value={lease.tenant_rg || ''}
              onChange={(e) => updateField('tenant_rg', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Data de Nascimento</label>
            <input
              type="date"
              value={lease.tenant_birth_date || ''}
              onChange={(e) => updateField('tenant_birth_date', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Estado Civil</label>
            <select
              value={lease.tenant_marital_status || ''}
              onChange={(e) => updateField('tenant_marital_status', e.target.value)}
              className={inputClass}
            >
              <option value="">Selecione</option>
              <option value="solteiro">Solteiro(a)</option>
              <option value="casado">Casado(a)</option>
              <option value="uniao_estavel">União Estável</option>
              <option value="divorciado">Divorciado(a)</option>
              <option value="viuvo">Viúvo(a)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Mail size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Contato</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>E-mail</label>
            <input
              type="email"
              value={lease.tenant_email || ''}
              onChange={(e) => updateField('tenant_email', e.target.value)}
              className={inputClass}
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <label className={labelClass}>Telefone</label>
            <input
              value={lease.tenant_phone || ''}
              onChange={(e) => updateField('tenant_phone', e.target.value)}
              className={inputClass}
              placeholder="(61) 99999-0000"
            />
          </div>
        </div>
      </section>

      {/* Endereço */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><MapPin size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Endereço</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>CEP</label>
            <div className="relative">
              <input
                value={lease.tenant_address_zip || ''}
                onChange={(e) => updateField('tenant_address_zip', e.target.value)}
                onBlur={(e) => handleCepBlur(e.target.value)}
                className={inputClass}
                placeholder="00000-000"
                maxLength={9}
              />
              {cepLoading && (
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
          </div>
          <div className="md:col-span-3">
            <label className={labelClass}>Logradouro</label>
            <input
              value={lease.tenant_address_street || ''}
              onChange={(e) => updateField('tenant_address_street', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Número</label>
            <input
              value={lease.tenant_address_number || ''}
              onChange={(e) => updateField('tenant_address_number', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Complemento</label>
            <input
              value={lease.tenant_address_complement || ''}
              onChange={(e) => updateField('tenant_address_complement', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Bairro</label>
            <input
              value={lease.tenant_address_neighborhood || ''}
              onChange={(e) => updateField('tenant_address_neighborhood', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Cidade</label>
            <input
              value={lease.tenant_city || ''}
              onChange={(e) => updateField('tenant_city', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>UF</label>
            <select
              value={lease.tenant_state || ''}
              onChange={(e) => updateField('tenant_state', e.target.value)}
              className={inputClass}
            >
              <option value="">UF</option>
              {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Co-locatários */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Users size={20} /></div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Co-locatários</h4>
          </div>
          <button
            onClick={addCoTenant}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>
        {coTenants.map((ct, idx) => (
          <div key={idx} className="flex items-center gap-3 mb-3 p-3 bg-slate-50 rounded-xl">
            <input
              placeholder="Nome"
              value={ct.name}
              onChange={(e) => {
                const updated = [...coTenants];
                updated[idx].name = e.target.value;
                setCoTenants(updated);
              }}
              className="flex-1 px-4 py-2 bg-white rounded-lg border border-slate-200 text-sm outline-none"
            />
            <input
              placeholder="CPF"
              value={ct.cpf}
              onChange={(e) => {
                const updated = [...coTenants];
                updated[idx].cpf = e.target.value;
                setCoTenants(updated);
              }}
              className="w-44 px-4 py-2 bg-white rounded-lg border border-slate-200 text-sm outline-none"
            />
            <button
              onClick={() => removeCoTenant(idx)}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              <X size={16} />
            </button>
          </div>
        ))}
        {coTenants.length === 0 && (
          <p className="text-sm text-slate-400 italic">Nenhum co-locatário adicionado</p>
        )}
      </section>
    </div>
  );
};
