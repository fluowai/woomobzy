import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { Leaf, AlertTriangle, RefreshCw } from 'lucide-react';
import { callApi } from '../src/lib/api';

interface PriceData {
  valor: number;
  unidade: string;
  data: string;
  moeda: string;
}

const AgroMarketWidget: React.FC = () => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchPrices = async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await callApi('/api/rural/market/prices');
      if (!result?.success || !result?.data) {
        throw new Error(result?.error || 'Cotações indisponíveis');
      }
      setPrices(result.data);
    } catch (err) {
      logger.error('Serviço de cotações agro indisponível', err);
      setPrices({});
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const productLabels: Record<string, string> = {
    soja: 'Soja (PR)',
    milho: 'Milho (SP)',
    boi_gordo: 'Boi Gordo',
    cafe: 'Café Arábica',
    trigo: 'Trigo',
  };

  return (
    <div className="bg-bg-card p-6 rounded-2xl border border-emerald-500/20 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none" />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <Leaf size={20} />
          </div>
          <h3 className="font-bold text-text-primary">Mercado Agro 360</h3>
        </div>
        <button
          onClick={fetchPrices}
          className="p-1.5 hover:bg-bg-hover rounded-md text-tertiary transition-colors"
          title="Atualizar Cotações"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-4">
        {!loading && error && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0 text-amber-500"
            />
            <p className="text-xs text-secondary">
              Não foi possível consultar as cotações reais agora.
            </p>
          </div>
        )}
        {Object.entries(prices).map(([key, data]: [string, PriceData]) => (
          <div
            key={key}
            className="flex items-center justify-between p-3 bg-bg-hover rounded-xl border border-subtle hover:border-emerald-500/30 transition-all"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">
                {productLabels[key] || key}
              </span>
              <span className="text-xs text-secondary">{data.data}</span>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <span className="text-sm font-bold text-text-primary">
                  {data.moeda}{' '}
                  {data.valor.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <span className="text-[9px] text-tertiary font-bold uppercase">
                por {data.unidade}
              </span>
            </div>
          </div>
        ))}
      </div>

      {!loading && !error && Object.keys(prices).length === 0 && (
        <p className="mt-4 text-center text-xs text-tertiary">
          Nenhuma cotação foi retornada pela fonte.
        </p>
      )}
    </div>
  );
};

export default AgroMarketWidget;
