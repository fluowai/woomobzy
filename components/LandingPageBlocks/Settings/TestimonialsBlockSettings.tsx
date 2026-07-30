import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface TestimonialsBlockSettingsProps {
  config: any;
  onUpdate: (config: any) => void;
}

const TestimonialsBlockSettings: React.FC<TestimonialsBlockSettingsProps> = ({
  config,
  onUpdate,
}) => {
  const testimonials = config.testimonials || [];

  const updateField = (field: string, value: any) => {
    onUpdate({ ...config, [field]: value });
  };

  const addTestimonial = () => {
    updateField('testimonials', [
      ...testimonials,
      { name: 'Novo Cliente', text: 'Texto do depoimento', rating: 5, photo: '' },
    ]);
  };

  const updateTestimonial = (
    index: number,
    field: string,
    value: any
  ) => {
    const newItems = [...testimonials];
    newItems[index] = { ...newItems[index], [field]: value };
    updateField('testimonials', newItems);
  };

  const removeTestimonial = (index: number) => {
    updateField(
      'testimonials',
      testimonials.filter((_: any, i: number) => i !== index)
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Layout
        </label>
        <select
          value={config.layout || 'grid'}
          onChange={(e) => updateField('layout', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="grid">Grade</option>
          <option value="carousel">Carrossel</option>
        </select>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="testimonials-show-rating"
          checked={config.showRating !== false}
          onChange={(e) => updateField('showRating', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="testimonials-show-rating"
          className="ml-2 text-sm text-gray-700"
        >
          Mostrar Avaliação (estrelas)
        </label>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">Depoimentos</h4>
          <button
            onClick={addTestimonial}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Adicionar
          </button>
        </div>

        <div className="space-y-3">
          {testimonials.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhum depoimento adicionado
            </p>
          )}
          {testimonials.map((item: any, index: number) => (
            <div
              key={index}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Depoimento {index + 1}
                </span>
                <button
                  onClick={() => removeTestimonial(index)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) =>
                    updateTestimonial(index, 'name', e.target.value)
                  }
                  placeholder="Nome do cliente"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="url"
                  value={item.photo || ''}
                  onChange={(e) =>
                    updateTestimonial(index, 'photo', e.target.value)
                  }
                  placeholder="URL da foto (opcional)"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={item.text}
                  onChange={(e) =>
                    updateTestimonial(index, 'text', e.target.value)
                  }
                  placeholder="Texto do depoimento"
                  rows={3}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Avaliação: {item.rating || 5} de 5
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={item.rating || 5}
                    onChange={(e) =>
                      updateTestimonial(
                        index,
                        'rating',
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full"
                  />
                </div>
                <input
                  type="text"
                  value={item.date || ''}
                  onChange={(e) =>
                    updateTestimonial(index, 'date', e.target.value)
                  }
                  placeholder="Data (opcional)"
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

export default TestimonialsBlockSettings;
