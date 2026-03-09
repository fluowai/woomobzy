import React, { useState } from 'react';
import { Check, Eye, Sparkles } from 'lucide-react';
import { LANDING_PAGE_TEMPLATES, LandingPageTemplate } from '../services/landingPageTemplates';

interface TemplateSelectorProps {
  onSelectTemplate: (templateId: string) => void;
  onCreateBlank: () => void;
  onCreateWithAI: () => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onSelectTemplate,
  onCreateBlank,
  onCreateWithAI
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<LandingPageTemplate | null>(null);

  const handleSelect = (templateId: string) => {
    setSelectedId(templateId);
  };

  const handleConfirm = () => {
    if (selectedId) {
      onSelectTemplate(selectedId);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Escolha um Template
        </h2>
        <p className="text-gray-600">
          Comece com um design profissional pronto ou crie do zero
        </p>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {LANDING_PAGE_TEMPLATES.map((template) => {
          const isSelected = selectedId === template.id;
          
          return (
            <div
              key={template.id}
              onClick={() => handleSelect(template.id)}
              className={`relative cursor-pointer rounded-xl border-2 transition-all hover:shadow-lg ${
                isSelected
                  ? 'border-indigo-600 shadow-lg ring-2 ring-indigo-600 ring-offset-2'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              {/* Thumbnail */}
              <div
                className="h-48 rounded-t-xl flex items-center justify-center text-6xl"
                style={{
                  backgroundColor: template.themeConfig.primaryColor,
                  opacity: 0.9
                }}
              >
                <span className="filter drop-shadow-lg">{template.thumbnail}</span>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-900 mb-1">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {template.description}
                </p>

                {/* Theme Colors */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: template.themeConfig.primaryColor }}
                  />
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: template.themeConfig.secondaryColor }}
                  />
                  <span className="text-xs text-gray-500 ml-auto">
                    {template.blocks.length} blocos
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewTemplate(template);
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <Eye size={16} />
                    Preview
                  </button>
                  <button
                    onClick={() => handleSelect(template.id)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check size={16} className="inline mr-1" />
                        Selecionado
                      </>
                    ) : (
                      'Usar'
                    )}
                  </button>
                </div>
              </div>

              {/* Selected Badge */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 bg-indigo-600 text-white rounded-full p-2 shadow-lg">
                  <Check size={20} />
                </div>
              )}
            </div>
          );
        })}

        {/* Create Blank Option */}
        <div
          onClick={onCreateBlank}
          className="relative cursor-pointer rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-all hover:shadow-lg"
        >
          <div className="h-48 rounded-t-xl flex flex-col items-center justify-center bg-gray-50">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-3">
              <span className="text-3xl">✨</span>
            </div>
            <p className="font-medium text-gray-700">Começar do Zero</p>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              Crie sua landing page do zero com total flexibilidade
            </p>
            <button className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
              Página em Branco
            </button>
          </div>
        </div>

        {/* Create with AI Option */}
        <div
          onClick={onCreateWithAI}
          className="relative cursor-pointer rounded-xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 hover:border-purple-500 transition-all hover:shadow-lg"
        >
          <div className="h-48 rounded-t-xl flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3">
              <Sparkles className="text-white" size={32} />
            </div>
            <p className="font-bold text-purple-900">Criar com IA</p>
          </div>
          <div className="p-4">
            <p className="text-sm text-purple-800 mb-4">
              Deixe a IA gerar uma página personalizada para seu imóvel
            </p>
            <button className="w-full px-3 py-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-medium">
              Gerar com IA
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      {selectedId && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={() => setSelectedId(null)}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Continuar com Template
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {previewTemplate.name}
                  </h3>
                  <p className="text-gray-600">{previewTemplate.description}</p>
                </div>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Theme Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Cores do Tema</h4>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border shadow-sm"
                      style={{ backgroundColor: previewTemplate.themeConfig.primaryColor }}
                    />
                    <span className="text-xs text-gray-600">Principal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border shadow-sm"
                      style={{ backgroundColor: previewTemplate.themeConfig.secondaryColor }}
                    />
                    <span className="text-xs text-gray-600">Secundária</span>
                  </div>
                  <div className="ml-auto text-sm text-gray-600">
                    Font: {previewTemplate.themeConfig.fontFamily}
                  </div>
                </div>
              </div>

              {/* Blocks List */}
              <div className="space-y-2 mb-6">
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Blocos Inclusos</h4>
                {previewTemplate.blocks.map((block, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {block.type.replace(/_/g, ' ')}
                      </p>
                      {block.config.title && (
                        <p className="text-xs text-gray-500 truncate">
                          {block.config.title}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    setSelectedId(previewTemplate.id);
                    setPreviewTemplate(null);
                    handleConfirm();
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Usar Este Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;
