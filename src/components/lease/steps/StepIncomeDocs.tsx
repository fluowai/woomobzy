import React from 'react';
import { Briefcase, DollarSign, Upload, FileCheck } from 'lucide-react';
import type { Lease } from '../../../types/lease';

interface Props {
  lease: Partial<Lease>;
  updateField: <K extends keyof Lease>(key: K, value: Lease[K]) => void;
  updateFields: (fields: Partial<Lease>) => void;
}

const inputClass = 'w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all';
const labelClass = 'text-[10px] font-black text-slate-500 uppercase tracking-widest';

export const StepIncomeDocs: React.FC<Props> = ({ lease, updateField }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Dados Profissionais */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Briefcase size={20} /></div>
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Dados Profissionais</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Profissão</label>
            <input
              value={lease.tenant_profession || ''}
              onChange={(e) => updateField('tenant_profession', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Empresa / Empregador</label>
            <input
              value={lease.tenant_employer || ''}
              onChange={(e) => updateField('tenant_employer', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Telefone do Trabalho</label>
            <input
              value={lease.tenant_employer_phone || ''}
              onChange={(e) => updateField('tenant_employer_phone' as any, e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Renda */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><DollarSign size={20} /></div>
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Renda</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Renda Mensal (R$)</label>
            <input
              type="number"
              value={lease.tenant_monthly_income || ''}
              onChange={(e) => updateField('tenant_monthly_income', Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Status do Comprovante</label>
            <select
              value={lease.income_proof_status || 'pendente'}
              onChange={(e) => updateField('income_proof_status' as any, e.target.value)}
              className={inputClass}
            >
              <option value="pendente">Pendente</option>
              <option value="recebido">Recebido</option>
              <option value="validado">Validado</option>
              <option value="reprovado">Reprovado</option>
            </select>
          </div>
        </div>
      </section>

      {/* Documentos */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600"><Upload size={20} /></div>
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Documentos Anexados</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'doc_rg', label: 'RG / Identidade' },
            { key: 'doc_cpf', label: 'CPF' },
            { key: 'doc_cnh', label: 'CNH' },
            { key: 'doc_income_proof', label: 'Comprovante de Renda' },
            { key: 'doc_residence_proof', label: 'Comprovante de Residência' },
            { key: 'doc_irpf', label: 'Declaração IRPF' },
            { key: 'doc_marriage_cert', label: 'Certidão Casamento' },
            { key: 'doc_property_proof', label: 'Matrícula do Imóvel (se fiador)' },
          ].map((doc) => (
            <div
              key={doc.key}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <FileCheck size={18} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-700">{doc.label}</span>
              </div>
              <button className="text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all">
                Anexar
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
