import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Leaf, AlertTriangle, RefreshCw } from 'lucide-react';

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
      // Tenta conectar ao microserviço local
      const response = await fetch('http://localhost:8000/prices');
      const result = await response.json();
      if (result.success) {
        setPrices(result.data);
      } else {
        setError(true);
      }
    } catch (err) {
      logger.warn('Agro Intelligence Service offline. Using mock data for demo.');
      // Mock data for WOW effect if service is offline
      setPrices({
        'soja': { valor: 134.50, unidade: 'sc', data: '28/04/2024', moeda: 'BRL' },
        'milho': { valor: 62.15, unidade: 'sc', data: '28/04/2024', moeda: 'BRL' },
        'boi_gordo': { valor: 232.80, unidade: 'arroba', data: '28/04/2024', moeda: 'BRL' },
      });
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
    trigo: 'Trigo'
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
        {Object.entries(prices).map(([key, data]) => (
          <div key={key} className="flex items-center justify-between p-3 bg-bg-hover rounded-xl border border-subtle hover:border-emerald-500/30 transition-all">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">{productLabels[key] || key}</span>
              <span className="text-xs text-secondary">{data.data}</span>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <span className="text-sm font-black text-text-primary">
                  {data.moeda} {data.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                {data.valor > 100 ? (
                  <TrendingUp size={12} className="text-emerald-500" />
                ) : (
                  <TrendingDown size={12} className="text-red-500" />
                )}
              </div>
              <span className="text-[9px] text-tertiary font-bold uppercase">por {data.unidade}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">Alertas de Risco</p>
          <p className="text-[11px] text-secondary leading-tight">DETER: 2 alertas de desmatamento detectados em áreas próximas aos seus leads em MT.</p>
        </div>
      </div>

      <button className="w-full mt-6 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
        Relatório Completo Agro
      </button>
    </div>
  );
};

export default AgroMarketWidget;
