import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface PropertyCarouselBlockSettingsProps {
  config: any;
  onUpdate: (config: any) => void;
}

const PropertyCarouselBlockSettings: React.FC<
  PropertyCarouselBlockSettingsProps
> = ({ config, onUpdate }) => {
  const images = config.images || [];

  const updateField = (field: string, value: any) => {
    onUpdate({ ...config, [field]: value });
  };

  const addImage = () => {
    updateField('images', [
      ...images,
      { src: '', alt: `Foto ${images.length + 1}` },
    ]);
  };

  const updateImage = (index: number, field: string, value: string) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], [field]: value };
    updateField('images', newImages);
  };

  const removeImage = (index: number) => {
    updateField(
      'images',
      images.filter((_: any, i: number) => i !== index)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.showThumbnails !== false}
            onChange={(e) => updateField('showThumbnails', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Miniaturas</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.showDots !== false}
            onChange={(e) => updateField('showDots', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Pontos</span>
        </label>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">Imagens</h4>
          <button
            onClick={addImage}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Adicionar
          </button>
        </div>

        <div className="space-y-3">
          {images.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhuma imagem adicionada
            </p>
          )}
          {images.map((img: any, index: number) => (
            <div
              key={index}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Foto {index + 1}
                </span>
                <button
                  onClick={() => removeImage(index)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="space-y-2">
                <input
                  type="url"
                  value={img.src || ''}
                  onChange={(e) => updateImage(index, 'src', e.target.value)}
                  placeholder="URL da imagem"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={img.alt || ''}
                  onChange={(e) => updateImage(index, 'alt', e.target.value)}
                  placeholder="Descrição"
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

export default PropertyCarouselBlockSettings;
