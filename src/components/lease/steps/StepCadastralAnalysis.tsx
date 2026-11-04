import React from 'react';
import { ShieldCheck, AlertTriangle, UserCheck, FileText } from 'lucide-react';
import type { Lease } from '../../../types/lease';

interface Props {
  lease: Partial<Lease>;
  updateField: <K extends keyof Lease>(key: K, value: Lease[K]) => void;
  updateFields: (fields: Partial<Lease>) => void;
}

const inputClass = 'w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all';
const labelClass = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest';

export const StepCadastralAnalysis: React.FC<Props> = ({ lease, updateField }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Status da Análise */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600"><ShieldCheck size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Status da Análise</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={lease.evaluation_status || 'em_analise'}
              onChange={(e) => updateField('evaluation_status', e.target.value as any)}
              className={inputClass}
            >
              <option value="em_analise">Em Análise</option>
              <option value="aprovado">Aprovado</option>
              <option value="aprovado_com_ressalva">Aprovado com Ressalva</option>
              <option value="reprovado">Reprovado</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Score: {lease.evaluation_score || 0}</label>
            <input
              type="range"
              min="0" max="100"
              value={lease.evaluation_score || 0}
              onChange={(e) => updateField('evaluation_score', Number(e.target.value))}
              className="w-full accent-blue-600 mt-2"
            />
          </div>
          <div>
            <label className={labelClass}>Score de Crédito</label>
            <input
              type="number"
              value={lease.credit_score || ''}
              onChange={(e) => updateField('credit_score', Number(e.target.value))}
              className={inputClass}
              placeholder="0-1000"
            />
          </div>
        </div>
      </section>

      {/* Restrições */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-red-50 rounded-xl text-red-600"><AlertTriangle size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Restrições Cadastrais</h4>
        </div>
        <label className="flex items-center gap-3 mb-4 p-4 bg-slate-50 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={lease.has_restrictions || false}
            onChange={(e) => updateField('has_restrictions', e.target.checked)}
            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <p className="text-sm font-bold text-slate-700">Possui restrições cadastrais</p>
            <p className="text-xs text-slate-400">SPC, Serasa, protestos ou ações judiciais</p>
          </div>
        </label>
        {lease.has_restrictions && (
          <textarea
            value={lease.restriction_notes || ''}
            onChange={(e) => updateField('restriction_notes', e.target.value)}
            className="w-full min-h-[100px] px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none"
            placeholder="Descreva as restrições encontradas..."
          />
        )}
      </section>

      {/* Referências */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><UserCheck size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Referências</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Locador Anterior</label>
            <input
              value={lease.tenant_previous_landlord || ''}
              onChange={(e) => updateField('tenant_previous_landlord' as any, e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Telefone do Locador Anterior</label>
            <input
              value={lease.tenant_previous_landlord_phone || ''}
              onChange={(e) => updateField('tenant_previous_landlord_phone' as any, e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Observações */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><FileText size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Observações da Análise</h4>
        </div>
        <textarea
          value={lease.analysis_notes || ''}
          onChange={(e) => updateField('analysis_notes', e.target.value)}
          className="w-full min-h-[120px] px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none"
          placeholder="Anotações relevantes sobre a análise cadastral..."
        />
      </section>
    </div>
  );
};
