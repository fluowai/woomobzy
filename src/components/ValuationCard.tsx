import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  RefreshCw,
  Brain,
} from 'lucide-react';

interface ValuationData {
  id: string;
  estimated_value: number;
  min_value: number;
  max_value: number;
  confidence: number;
  method: string;
  factors: Array<{ rule: string; type: string; value: number }>;
  breakdown: Record<string, any>;
  created_at: string;
}

interface ValuationCardProps {
  propertyId: string;
}

const ValuationCard: React.FC<ValuationCardProps> = ({ propertyId }) => {
  const [valuation, setValuation] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [comparables, setComparables] = useState<any[]>([]);
  const [loadingComparables, setLoadingComparables] = useState(false);

  const handleEstimate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/valuation/estimate/${propertyId}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setValuation(data.valuation);
    } catch (err: any) {
      setError(err.message || 'Erro ao estimar valor');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadComparables = async () => {
    setLoadingComparables(true);
    try {
      const res = await fetch(`/api/valuation/comparables/${propertyId}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) setComparables(data.comparables);
    } catch {
      // Silently fail
    } finally {
      setLoadingComparables(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-emerald-500';
    if (confidence >= 0.5) return 'text-amber-500';
    return 'text-slate-400';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.7) return 'Alta';
    if (confidence >= 0.5) return 'Média';
    return 'Baixa';
  };

  const hasValuationHistory = async () => {
    try {
      const res = await fetch(`/api/valuation/history/${propertyId}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.history?.length > 0 && !valuation) {
        setValuation(data.history[0]);
      }
    } catch {
      // Silently fail
    }
  };

  React.useEffect(() => {
    hasValuationHistory();
  }, [propertyId]);

  if (error) {
    return (
      <div className="border border-rose-200 bg-rose-50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-rose-600">
          <AlertCircle size={18} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 bg-white rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-indigo-500" />
          <h3 className="font-semibold text-slate-800">Valuation Intelligence</h3>
        </div>
        {valuation && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getConfidenceColor(valuation.confidence)} bg-slate-50 border`}>
            Confiança: {getConfidenceLabel(valuation.confidence)}
          </span>
        )}
      </div>

      <div className="px-5 py-4">
        {!valuation ? (
          <button
            onClick={handleEstimate}
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Calculando...
              </>
            ) : (
              <>
                <TrendingUp size={16} />
                Estimar Valor do Imóvel
              </>
            )}
          </button>
        ) : (
          <>
            <div className="text-center mb-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                Valor Estimado
              </div>
              <div className="text-3xl font-bold text-slate-800">
                {formatCurrency(valuation.estimated_value)}
              </div>
              <div className="text-sm text-slate-500 mt-1">
                Faixa: {formatCurrency(valuation.min_value)} — {formatCurrency(valuation.max_value)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-500">Preço/ha</div>
                <div className="text-sm font-semibold text-slate-700">
                  {valuation.breakdown?.area_ha > 0
                    ? formatCurrency(valuation.estimated_value / valuation.breakdown.area_ha)
                    : '—'}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-500">Multiplicador</div>
                <div className="text-sm font-semibold text-slate-700">
                  {valuation.breakdown?.multiplier
                    ? `${(valuation.breakdown.multiplier * 100).toFixed(0)}%`
                    : '—'}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-3"
            >
              {showDetails ? 'Ocultar detalhes' : 'Ver detalhes da avaliação'}
            </button>

            {showDetails && (
              <div className="bg-slate-50 rounded-lg p-3 mb-3 text-xs space-y-1">
                <div className="text-slate-500 font-medium mb-2">Fatores aplicados:</div>
                {valuation.factors?.map((f, i) => (
                  <div key={i} className="flex justify-between text-slate-600">
                    <span>{f.rule}</span>
                    <span className={f.type === 'multiplier'
                      ? (f.value >= 1 ? 'text-emerald-600' : 'text-rose-600')
                      : 'text-indigo-600'
                    }>
                      {f.type === 'multiplier'
                        ? `${((f.value - 1) * 100).toFixed(0)}%`
                        : formatCurrency(f.value)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 mt-2 border-t border-slate-200 text-slate-400">
                  Método: {valuation.method === 'rule_based' ? 'Regras de Negócio' : valuation.method}
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 mt-1">
              <button
                onClick={handleLoadComparables}
                disabled={loadingComparables}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <ArrowUpRight size={14} />
                {loadingComparables ? 'Buscando...' : 'Comparáveis na região'}
              </button>

              {comparables.length > 0 && (
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {comparables.map((c) => (
                    <div key={c.id} className="flex justify-between items-center bg-slate-50 rounded p-2 text-xs">
                      <div className="truncate flex-1">
                        <div className="font-medium text-slate-700 truncate">{c.title}</div>
                        <div className="text-slate-400">{c.price_per_ha.toLocaleString()} /ha</div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="font-semibold text-slate-700">{formatCurrency(c.price)}</div>
                        <div className="text-slate-400">{c.area_ha} ha</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ValuationCard;
