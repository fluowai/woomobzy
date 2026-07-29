import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface StatsBlockSettingsProps {
  config: any;
  onUpdate: (config: any) => void;
}

const StatsBlockSettings: React.FC<StatsBlockSettingsProps> = ({ config, onUpdate }) => {
  const { stats = [] } = config;

  const handleUpdateStat = (index: number, field: string, value: string) => {
    const newStats = [...stats];
    newStats[index] = { ...newStats[index], [field]: value };
    onUpdate({ ...config, stats: newStats });
  };

  const handleAddStat = () => {
    onUpdate({
      ...config,
      stats: [
        ...stats,
        { icon: '⭐', value: '0', label: 'Novo Item' },
      ],
    });
  };

  const handleRemoveStat = (index: number) => {
    const newStats = stats.filter((_: any, i: number) => i !== index);
    onUpdate({ ...config, stats: newStats });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-4">
          <label className="block text-sm font-medium text-gray-300">
            Itens de Estatística
          </label>
          <button
            onClick={handleAddStat}
            className="p-1 hover:bg-gray-800 rounded text-blue-400 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          {stats.map((stat: any, index: number) => (
            <div key={index} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 space-y-3 relative group">
              <button
                onClick={() => handleRemoveStat(index)}
                className="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-700 rounded"
              >
                <Trash2 size={16} />
              </button>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Ícone (Emoji)</label>
                <input
                  type="text"
                  value={stat.icon || ''}
                  onChange={(e) => handleUpdateStat(index, 'icon', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white"
                  placeholder="Ex: ⭐, 🚀"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Valor</label>
                <input
                  type="text"
                  value={stat.value || ''}
                  onChange={(e) => handleUpdateStat(index, 'value', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white"
                  placeholder="Ex: 500+"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Descrição</label>
                <input
                  type="text"
                  value={stat.label || ''}
                  onChange={(e) => handleUpdateStat(index, 'label', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white"
                  placeholder="Ex: Imóveis Vendidos"
                />
              </div>
            </div>
          ))}
          
          {stats.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-500">
              Nenhuma estatística adicionada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsBlockSettings;