import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, UserCheck, FileText, Sparkles, Loader2 } from 'lucide-react';
import type { Lease } from '../../../types/lease';
import { analyzeLeaseRisk } from '../../../../services/geminiService';

interface Props {
  lease: Partial<Lease>;
  updateField: <K extends keyof Lease>(key: K, value: Lease[K]) => void;
  updateFields: (fields: Partial<Lease>) => void;
}

const inputClass = 'w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all';
const labelClass = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest';

export const StepCadastralAnalysis: React.FC<Props> = ({ lease, updateField }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [riskResult, setRiskResult] = useState<{
    risk_level: 'baixo' | 'medio' | 'alto';
    risk_score: number;
    recommendation: string;
    factors: string[];
  } | null>(null);

  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    setRiskResult(null);
    try {
      const result = await analyzeLeaseRisk({
        tenant_name: lease.tenant_name || 'Não informado',
        tenant_type: lease.tenant_type || 'PF',
        tenant_monthly_income: lease.tenant_monthly_income,
        monthly_rent: lease.monthly_rent || 0,
        guarantee_type: lease.guarantee_type || 'sem',
        credit_score: lease.credit_score,
        has_restrictions: lease.has_restrictions || false,
      });
      setRiskResult(result);
      if (result.risk_score) {
        updateField('evaluation_score', result.risk_score);
      }
    } catch (error) {
      console.error('Erro na análise IA:', error);
    } finally {
      setAnalyzing(false);
    }
  };
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

      {/* Análise com IA */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600"><Sparkles size={20} /></div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Análise de Risco com IA</h4>
          </div>
          <button
            onClick={handleAIAnalysis}
            disabled={analyzing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {analyzing ? 'Analisando...' : 'Analisar Risco'}
          </button>
        </div>

        {riskResult && (
          <div className={`mt-4 p-4 rounded-xl border ${
            riskResult.risk_level === 'baixo' ? 'bg-emerald-50 border-emerald-200' :
            riskResult.risk_level === 'alto' ? 'bg-red-50 border-red-200' :
            'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nível de Risco</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                riskResult.risk_level === 'baixo' ? 'bg-emerald-100 text-emerald-700' :
                riskResult.risk_level === 'alto' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {riskResult.risk_level.toUpperCase()}
              </span>
              <span className="text-xs font-bold text-slate-500">Score: {riskResult.risk_score}/100</span>
            </div>
            <p className="text-sm text-slate-700 mb-2">{riskResult.recommendation}</p>
            {riskResult.factors.length > 0 && (
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                {riskResult.factors.map((factor, idx) => (
                  <li key={idx}>{factor}</li>
                ))}
              </ul>
            )}
          </div>
        )}
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
