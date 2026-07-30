import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface GalleryBlockSettingsProps {
  config: any;
  onUpdate: (config: any) => void;
}

const GalleryBlockSettings: React.FC<GalleryBlockSettingsProps> = ({
  config,
  onUpdate,
}) => {
  const images = config.images || [];

  const updateField = (field: string, value: any) => {
    onUpdate({ ...config, [field]: value });
  };

  const addImage = () => {
    updateField('images', [
      ...images,
      { src: '', alt: `Foto ${images.length + 1}`, caption: '' },
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Colunas
        </label>
        <select
          value={config.columns || 3}
          onChange={(e) => updateField('columns', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={1}>1 Coluna</option>
          <option value={2}>2 Colunas</option>
          <option value={3}>3 Colunas</option>
          <option value={4}>4 Colunas</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Espaçamento (px)
        </label>
        <input
          type="number"
          value={config.spacing || config.gap || 16}
          onChange={(e) => {
            updateField('spacing', parseInt(e.target.value));
            updateField('gap', parseInt(e.target.value));
          }}
          min="0"
          max="48"
          step="4"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="gallery-lightbox"
          checked={config.lightbox !== false}
          onChange={(e) => updateField('lightbox', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="gallery-lightbox"
          className="ml-2 text-sm text-gray-700"
        >
          Ativar Lightbox
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
                  Imagem {index + 1}
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
                  placeholder="Texto alternativo"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={img.caption || ''}
                  onChange={(e) => updateImage(index, 'caption', e.target.value)}
                  placeholder="Legenda (opcional)"
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

export default GalleryBlockSettings;
