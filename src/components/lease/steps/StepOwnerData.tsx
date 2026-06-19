import React from 'react';
import { Home, User, DollarSign, Building2 } from 'lucide-react';
import type { Lease } from '../../../types/lease';

interface Props {
  lease: Partial<Lease>;
  updateField: <K extends keyof Lease>(key: K, value: Lease[K]) => void;
  updateFields: (fields: Partial<Lease>) => void;
}

const inputClass = 'w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all';
const labelClass = 'text-[10px] font-black text-slate-500 uppercase tracking-widest';

export const StepOwnerData: React.FC<Props> = ({ lease, updateField }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><User size={20} /></div>
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Dados do Proprietário</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Nome / Razão Social</label>
            <input
              value={lease.owner_name || ''}
              onChange={(e) => updateField('owner_name' as any, e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>CPF / CNPJ</label>
            <input
              value={lease.owner_cpf_cnpj || ''}
              onChange={(e) => updateField('owner_cpf_cnpj' as any, e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>E-mail</label>
            <input
              type="email"
              value={lease.owner_email || ''}
              onChange={(e) => updateField('owner_email' as any, e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Telefone</label>
            <input
              value={lease.owner_phone || ''}
              onChange={(e) => updateField('owner_phone' as any, e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>CEP</label>
            <input
              value={lease.owner_address_zip || ''}
              onChange={(e) => updateField('owner_address_zip' as any, e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Comissão */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><DollarSign size={20} /></div>
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Comissão da Imobiliária</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Percentual (%)</label>
            <input
              type="number"
              value={lease.commission_percent || ''}
              onChange={(e) => updateField('commission_percent', Number(e.target.value))}
              className={inputClass}
              placeholder="Ex: 10"
            />
          </div>
          <div>
            <label className={labelClass}>Pagador</label>
            <select
              value={lease.commission_payer || 'locador'}
              onChange={(e) => updateField('commission_payer', e.target.value as any)}
              className={inputClass}
            >
              <option value="locador">Locador (Proprietário)</option>
              <option value="locatario">Locatário (Inquilino)</option>
              <option value="ambos">Ambos</option>
            </select>
          </div>
          {lease.monthly_rent && lease.commission_percent && (
            <div className="p-4 bg-emerald-50 rounded-xl md:col-span-2">
              <p className="text-sm font-bold text-emerald-700">
                Valor da Comissão: R$ {((lease.monthly_rent * (lease.commission_percent || 0)) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                {' '}/ mês
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
