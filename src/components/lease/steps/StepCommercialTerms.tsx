import React from 'react';
import { DollarSign, Calendar, Percent, TrendingUp } from 'lucide-react';
import type { Lease } from '../../../types/lease';
import { ADJUSTMENT_INDICES_LABELS } from '../../../types/lease';

interface Props {
  lease: Partial<Lease>;
  updateField: <K extends keyof Lease>(key: K, value: Lease[K]) => void;
  updateFields: (fields: Partial<Lease>) => void;
}

const inputClass = 'w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all';
const labelClass = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest';

export const StepCommercialTerms: React.FC<Props> = ({ lease, updateField }) => {
  const startDate = lease.start_date ? new Date(lease.start_date) : null;
  const endDate = lease.end_date ? new Date(lease.end_date) : null;
  const durationMonths = startDate && endDate
    ? (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth())
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Valores */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><DollarSign size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Valores</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Valor do Aluguel (R$)</label>
            <input
              type="number"
              value={lease.monthly_rent || ''}
              onChange={(e) => updateField('monthly_rent', Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Dia Vencimento</label>
            <select
              value={lease.due_day || ''}
              onChange={(e) => updateField('due_day', Number(e.target.value))}
              className={inputClass}
            >
              <option value="">Selecione</option>
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>Dia {d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Valor Garantia (R$)</label>
            <input
              type="number"
              value={lease.guarantee_value || ''}
              onChange={(e) => updateField('guarantee_value', Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Período */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Calendar size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Período da Locação</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Data de Início</label>
            <input
              type="date"
              value={lease.start_date || ''}
              onChange={(e) => {
                const start = e.target.value;
                updateField('start_date', start);
                if (lease.end_date) {
                  const s = new Date(start);
                  const e = new Date(lease.end_date);
                  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
                  updateField('contract_duration_months', months);
                }
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Data de Término</label>
            <input
              type="date"
              value={lease.end_date || ''}
              onChange={(e) => {
                const end = e.target.value;
                updateField('end_date', end);
                if (lease.start_date) {
                  const s = new Date(lease.start_date);
                  const en = new Date(end);
                  const months = (en.getFullYear() - s.getFullYear()) * 12 + (en.getMonth() - s.getMonth());
                  updateField('contract_duration_months', months);
                }
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Prazo (meses)</label>
            <input
              type="number"
              value={durationMonths || lease.contract_duration_months || ''}
              onChange={(e) => updateField('contract_duration_months', Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Data de Ocupação</label>
            <input
              type="date"
              value={lease.occupation_date || ''}
              onChange={(e) => updateField('occupation_date', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Reajuste */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600"><TrendingUp size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Reajuste</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Índice de Reajuste</label>
            <select
              value={lease.adjustment_index || 'IGPM'}
              onChange={(e) => updateField('adjustment_index', e.target.value as any)}
              className={inputClass}
            >
              {Object.entries(ADJUSTMENT_INDICES_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Período (meses)</label>
            <select
              value={lease.adjustment_period_months || 12}
              onChange={(e) => updateField('adjustment_period_months', Number(e.target.value))}
              className={inputClass}
            >
              <option value={12}>12 meses</option>
              <option value={6}>6 meses</option>
            </select>
          </div>
        </div>
      </section>

      {/* Multas e Juros */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-red-50 rounded-xl text-red-600"><Percent size={20} /></div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Multas e Juros (Lei 8.245/91)</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Multa por Atraso (%)</label>
            <input
              type="number"
              step="0.1"
              value={lease.late_fee_percent ?? 2}
              onChange={(e) => updateField('late_fee_percent', Number(e.target.value))}
              className={inputClass}
            />
            <p className="text-[10px] text-slate-400 mt-1">Máx. 2% (Lei 8.245/91)</p>
          </div>
          <div>
            <label className={labelClass}>Juros por Dia (%)</label>
            <input
              type="number"
              step="0.00001"
              value={lease.late_interest_percent ?? 0.03333}
              onChange={(e) => updateField('late_interest_percent', Number(e.target.value))}
              className={inputClass}
            />
            <p className="text-[10px] text-slate-400 mt-1">Máx. 1% ao mês (0,03333%/dia)</p>
          </div>
          <div>
            <label className={labelClass}>Correção Monetária</label>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => updateField('currency_correction', true)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  lease.currency_correction !== false
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-50 text-slate-500'
                }`}
              >
                Sim
              </button>
              <button
                onClick={() => updateField('currency_correction', false)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  lease.currency_correction === false
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-50 text-slate-500'
                }`}
              >
                Não
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
