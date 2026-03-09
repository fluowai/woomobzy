import React, { useState } from 'react';
import { LandingPage } from '../../types/landingPage';
import { X, Search } from 'lucide-react';

interface SEOSettingsProps {
  page: LandingPage;
  onUpdate: (page: LandingPage) => void;
  onClose: () => void;
}

const SEOSettings: React.FC<SEOSettingsProps> = ({ page, onUpdate, onClose }) => {
  const [localPage, setLocalPage] = useState<LandingPage>(page);

  const updateField = (field: keyof LandingPage, value: any) => {
    const updated = { ...localPage, [field]: value };
    setLocalPage(updated);
    onUpdate(updated);
  };

  const addKeyword = () => {
    const keywords = localPage.metaKeywords || [];
    const newKeyword = prompt('Digite a palavra-chave:');
    if (newKeyword) {
      updateField('metaKeywords', [...keywords, newKeyword]);
    }
  };

  const removeKeyword = (index: number) => {
    const keywords = localPage.metaKeywords || [];
    updateField('metaKeywords', keywords.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Search className="text-blue-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">Configurações de SEO</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Meta Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meta Title
            </label>
            <input
              type="text"
              value={localPage.metaTitle || ''}
              onChange={(e) => updateField('metaTitle', e.target.value)}
              placeholder={localPage.title}
              maxLength={60}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              {(localPage.metaTitle || '').length}/60 caracteres (ideal: 50-60)
            </p>
          </div>

          {/* Meta Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meta Description
            </label>
            <textarea
              value={localPage.metaDescription || ''}
              onChange={(e) => updateField('metaDescription', e.target.value)}
              placeholder="Descrição que aparecerá nos resultados de busca"
              maxLength={160}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              {(localPage.metaDescription || '').length}/160 caracteres (ideal: 150-160)
            </p>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Palavras-chave
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(localPage.metaKeywords || []).map((keyword, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {keyword}
                  <button
                    onClick={() => removeKeyword(index)}
                    className="hover:text-blue-900"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <button
              onClick={addKeyword}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Adicionar Palavra-chave
            </button>
          </div>

          {/* OG Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Open Graph Image (URL)
            </label>
            <input
              type="url"
              value={localPage.ogImage || ''}
              onChange={(e) => updateField('ogImage', e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Imagem que aparecerá ao compartilhar em redes sociais (recomendado: 1200x630px)
            </p>
            {localPage.ogImage && (
              <div className="mt-3">
                <img
                  src={localPage.ogImage}
                  alt="OG Preview"
                  className="w-full max-w-md rounded-lg border border-gray-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Preview do Google
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-blue-600 text-xl mb-1 line-clamp-1">
                {localPage.metaTitle || localPage.title}
              </div>
              <div className="text-green-700 text-sm mb-2">
                {window.location.origin}/lp/{localPage.slug}
              </div>
              <div className="text-gray-600 text-sm line-clamp-2">
                {localPage.metaDescription || localPage.description || 'Sem descrição'}
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              💡 Dicas de SEO
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use palavras-chave relevantes no título e descrição</li>
              <li>• Mantenha o título entre 50-60 caracteres</li>
              <li>• Mantenha a descrição entre 150-160 caracteres</li>
              <li>• Use uma imagem OG de alta qualidade (1200x630px)</li>
              <li>• Seja descritivo e atrativo para aumentar cliques</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SEOSettings;
