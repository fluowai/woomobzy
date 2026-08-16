import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface TimelineBlockSettingsProps {
  config: any;
  onUpdate: (config: any) => void;
}

const TimelineBlockSettings: React.FC<TimelineBlockSettingsProps> = ({
  config,
  onUpdate,
}) => {
  const items = config.items || [];

  const updateField = (field: string, value: any) => {
    onUpdate({ ...config, [field]: value });
  };

  const addItem = () => {
    updateField('items', [
      ...items,
      { title: 'Novo Evento', description: 'Descrição do evento', time: '' },
    ]);
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateField('items', newItems);
  };

  const removeItem = (index: number) => {
    updateField(
      'items',
      items.filter((_: any, i: number) => i !== index)
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Título da Seção
        </label>
        <input
          type="text"
          value={config.title || ''}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Nossa História"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Layout
        </label>
        <select
          value={config.layout || 'left'}
          onChange={(e) => updateField('layout', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="left">Linha à Esquerda</option>
          <option value="center">Linha Central</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cor do Tema
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={config.color || '#3b82f6'}
            onChange={(e) => updateField('color', e.target.value)}
            className="h-10 w-20 rounded border border-gray-300"
          />
          <input
            type="text"
            value={config.color || '#3b82f6'}
            onChange={(e) => updateField('color', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">Eventos</h4>
          <button
            onClick={addItem}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Adicionar
          </button>
        </div>

        <div className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhum evento adicionado
            </p>
          )}
          {items.map((item: any, index: number) => (
            <div
              key={index}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Evento {index + 1}
                </span>
                <button
                  onClick={() => removeItem(index)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={item.time || ''}
                  onChange={(e) => updateItem(index, 'time', e.target.value)}
                  placeholder="Data (ex: 2024)"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItem(index, 'title', e.target.value)}
                  placeholder="Título do evento"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={item.description}
                  onChange={(e) =>
                    updateItem(index, 'description', e.target.value)
                  }
                  placeholder="Descrição do evento"
                  rows={2}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimelineBlockSettings;
