import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { X, Play } from 'lucide-react';
import { toast } from 'sonner';
import { leadService } from '../../services/leads';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedLeadIds?: string[];
  onSuccess: () => void;
}

export const LeadDistributionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedLeadIds = [],
  onSuccess,
}) => {
  const [strategies, setStrategies] = useState<
    { key: string; value: string; label: string }[]
  >([]);
  const [selectedStrategy, setSelectedStrategy] = useState('balanced');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStrategies();
    }
  }, [isOpen]);

  const loadStrategies = async () => {
    try {
      const data = await leadService.getDistributionStrategies();
      setStrategies(data);
      if (data.length > 0) {
        setSelectedStrategy(data[0].value);
      }
    } catch (error) {
      logger.error('Error loading distribution strategies:', error);
      toast.error('Erro ao carregar estratégias de distribuição');
    }
  };

  const handleDistribute = async () => {
    if (selectedLeadIds.length === 0) {
      toast.error('Nenhum lead selecionado.');
      return;
    }

    setLoading(true);
    try {
      if (selectedLeadIds.length === 1) {
        await leadService.distribute(selectedLeadIds[0], selectedStrategy);
        toast.success('Lead distribuído com sucesso!');
      } else {
        const res = await leadService.bulkDistribute(
          selectedLeadIds,
          selectedStrategy
        );
        toast.success(`${res.distributed} leads distribuídos com sucesso!`);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao distribuir leads');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Distribuir Leads</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-md text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            Você está prestes a distribuir{' '}
            <strong>{selectedLeadIds.length}</strong> lead(s). Escolha a
            estratégia de distribuição:
          </p>

          <div className="space-y-3">
            {strategies.map((strat) => (
              <label
                key={strat.key}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedStrategy === strat.value
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="strategy"
                  value={strat.value}
                  checked={selectedStrategy === strat.value}
                  onChange={(e) => setSelectedStrategy(e.target.value)}
                  className="mr-3"
                />
                <span className="text-sm font-medium text-slate-800">
                  {strat.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="p-5 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleDistribute}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg flex items-center gap-2"
            disabled={loading || selectedLeadIds.length === 0}
          >
            {loading ? 'Distribuindo...' : 'Distribuir'}
            {!loading && <Play size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};
