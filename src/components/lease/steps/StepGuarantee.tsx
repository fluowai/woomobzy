import React from 'react';
import { Lock, ShieldCheck, UserCheck, FileText, DollarSign } from 'lucide-react';
import type { Lease } from '../../../types/lease';
import { GUARANTEE_LABELS } from '../../../types/lease';

interface Props {
  lease: Partial<Lease>;
  updateField: <K extends keyof Lease>(key: K, value: Lease[K]) => void;
  updateFields: (fields: Partial<Lease>) => void;
}

const inputClass = 'w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all';
const labelClass = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest';

export const StepGuarantee: React.FC<Props> = ({ lease, updateField }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Tipo de Garantia */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Lock size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Tipo de Garantia</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['fiador', 'seguro_fianca', 'deposito_caucao', 'titulo_capitalizacao', 'sem'] as const).map((type) => (
            <button
              key={type}
              onClick={() => updateField('guarantee_type', type)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                lease.guarantee_type === type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <p className="text-sm font-bold text-slate-700">{GUARANTEE_LABELS[type]}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Fiador */}
      {lease.guarantee_type === 'fiador' && (
        <>
          <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600"><UserCheck size={20} /></div>
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Dados do Fiador</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Nome Completo</label>
                <input value={lease.guarantor_name || ''} onChange={(e) => updateField('guarantor_name', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>CPF</label>
                <input value={lease.guarantor_cpf || ''} onChange={(e) => updateField('guarantor_cpf', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>E-mail</label>
                <input type="email" value={lease.guarantor_email || ''} onChange={(e) => updateField('guarantor_email', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Telefone</label>
                <input value={lease.guarantor_phone || ''} onChange={(e) => updateField('guarantor_phone', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Renda Mensal (R$)</label>
                <input type="number" value={lease.guarantor_monthly_income || ''} onChange={(e) => updateField('guarantor_monthly_income', Number(e.target.value))} className={inputClass} />
              </div>
            </div>
          </section>

          {/* Cônjuge do Fiador */}
          <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600"><UserCheck size={20} /></div>
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Cônjuge do Fiador</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome</label>
                <input value={lease.guarantor_spouse_name || ''} onChange={(e) => updateField('guarantor_spouse_name' as any, e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>CPF</label>
                <input value={lease.guarantor_spouse_cpf || ''} onChange={(e) => updateField('guarantor_spouse_cpf' as any, e.target.value)} className={inputClass} />
              </div>
            </div>
          </section>
        </>
      )}

      {/* Seguro Fiança */}
      {lease.guarantee_type === 'seguro_fianca' && (
        <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><ShieldCheck size={20} /></div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Dados do Seguro</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Seguradora</label>
              <input value={lease.insurance_company || ''} onChange={(e) => updateField('insurance_company', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Número da Apólice</label>
              <input value={lease.insurance_policy_number || ''} onChange={(e) => updateField('insurance_policy_number', e.target.value)} className={inputClass} />
            </div>
          </div>
        </section>
      )}

      {/* Depósito Caução */}
      {lease.guarantee_type === 'deposito_caucao' && (
        <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><DollarSign size={20} /></div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Depósito Caução</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Valor (R$)</label>
              <input type="number" value={lease.caution_amount || ''} onChange={(e) => updateField('caution_amount', Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Data do Depósito</label>
              <input type="date" value={lease.caution_payment_date || ''} onChange={(e) => updateField('caution_payment_date', e.target.value)} className={inputClass} />
            </div>
          </div>
        </section>
      )}

      {/* Testemunhas */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><FileText size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Testemunhas</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Testemunha 1</p>
            <div className="space-y-3">
              <input value={lease.witness_1_name || ''} onChange={(e) => updateField('witness_1_name', e.target.value)} className={inputClass} placeholder="Nome" />
              <input value={lease.witness_1_cpf || ''} onChange={(e) => updateField('witness_1_cpf', e.target.value)} className={inputClass} placeholder="CPF" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Testemunha 2</p>
            <div className="space-y-3">
              <input value={lease.witness_2_name || ''} onChange={(e) => updateField('witness_2_name', e.target.value)} className={inputClass} placeholder="Nome" />
              <input value={lease.witness_2_cpf || ''} onChange={(e) => updateField('witness_2_cpf', e.target.value)} className={inputClass} placeholder="CPF" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
