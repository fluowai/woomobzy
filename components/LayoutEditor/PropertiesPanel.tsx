
import React from 'react';
import { useLayoutEditor } from '../../context/LayoutEditorContext';
import { X, Settings } from 'lucide-react';
import { HeroBlockConfig, TextBlockConfig, ImageBlockConfig, CTABlockConfig, StatsBlockConfig, FormBlockConfig, PropertyGridBlockConfig, BlockType } from '../../types';

export const PropertiesPanel: React.FC = () => {
  const { selectedBlock, updateBlock, selectBlock } = useLayoutEditor();

  if (!selectedBlock) {
    return (
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Settings size={24} className="text-slate-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-2">Nenhum bloco selecionado</h3>
        <p className="text-xs text-slate-500">
          Clique em um bloco no canvas para editar suas propriedades
        </p>
      </div>
    );
  }

  const updateConfig = (updates: Partial<any>) => {
    updateBlock(selectedBlock.id, {
      config: { ...selectedBlock.config, ...updates }
    });
  };

  const updateStyles = (updates: Partial<any>) => {
    updateBlock(selectedBlock.id, {
      styles: { ...selectedBlock.styles, ...updates }
    });
  };

  const renderConfigFields = () => {
    switch (selectedBlock.type) {
      case BlockType.HERO:
        const heroConfig = selectedBlock.config as HeroBlockConfig;
        return (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Título</label>
              <input
                type="text"
                value={heroConfig.title}
                onChange={(e) => updateConfig({ title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Subtítulo</label>
              <input
                type="text"
                value={heroConfig.subtitle || ''}
                onChange={(e) => updateConfig({ subtitle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Imagem de Fundo (URL)</label>
              <input
                type="text"
                value={heroConfig.backgroundImage}
                onChange={(e) => updateConfig({ backgroundImage: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Opacidade do Overlay: {heroConfig.overlayOpacity}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={heroConfig.overlayOpacity}
                onChange={(e) => updateConfig({ overlayOpacity: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Altura (px)</label>
              <input
                type="number"
                value={heroConfig.height}
                onChange={(e) => updateConfig({ height: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Texto do Botão</label>
              <input
                type="text"
                value={heroConfig.ctaText || ''}
                onChange={(e) => updateConfig({ ctaText: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Link do Botão</label>
              <input
                type="text"
                value={heroConfig.ctaLink || ''}
                onChange={(e) => updateConfig({ ctaLink: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </>
        );

      case BlockType.TEXT:
        const textConfig = selectedBlock.config as TextBlockConfig;
        return (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Conteúdo</label>
              <textarea
                value={textConfig.content}
                onChange={(e) => updateConfig({ content: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Tamanho da Fonte (px)</label>
              <input
                type="number"
                value={textConfig.fontSize}
                onChange={(e) => updateConfig({ fontSize: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Cor do Texto</label>
              <input
                type="color"
                value={textConfig.color}
                onChange={(e) => updateConfig({ color: e.target.value })}
                className="w-full h-10 rounded-lg"
              />
            </div>
          </>
        );

      case BlockType.IMAGE:
        const imageConfig = selectedBlock.config as ImageBlockConfig;
        return (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">URL da Imagem</label>
              <input
                type="text"
                value={imageConfig.src}
                onChange={(e) => updateConfig({ src: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Texto Alternativo</label>
              <input
                type="text"
                value={imageConfig.alt}
                onChange={(e) => updateConfig({ alt: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Largura</label>
              <input
                type="text"
                value={imageConfig.width}
                onChange={(e) => updateConfig({ width: e.target.value })}
                placeholder="100%, 500px, auto"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </>
        );

      case BlockType.CTA:
        const ctaConfig = selectedBlock.config as CTABlockConfig;
        return (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Título</label>
              <input
                type="text"
                value={ctaConfig.title}
                onChange={(e) => updateConfig({ title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Descrição</label>
              <textarea
                value={ctaConfig.description || ''}
                onChange={(e) => updateConfig({ description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Texto do Botão</label>
              <input
                type="text"
                value={ctaConfig.buttonText}
                onChange={(e) => updateConfig({ buttonText: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Cor de Fundo</label>
              <input
                type="color"
                value={ctaConfig.backgroundColor}
                onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                className="w-full h-10 rounded-lg"
              />
            </div>
          </>
        );

      case BlockType.PROPERTY_GRID:
        const gridConfig = selectedBlock.config as PropertyGridBlockConfig;
        return (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Colunas</label>
              <input
                type="number"
                min="1"
                max="4"
                value={gridConfig.columns}
                onChange={(e) => updateConfig({ columns: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Espaçamento (px)</label>
              <input
                type="number"
                value={gridConfig.gap}
                onChange={(e) => updateConfig({ gap: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={gridConfig.showFilters}
                  onChange={(e) => updateConfig({ showFilters: e.target.checked })}
                  className="rounded"
                />
                <span className="text-xs font-bold text-slate-700">Mostrar Filtros</span>
              </label>
            </div>
          </>
        );

      default:
        return (
          <p className="text-xs text-slate-500">
            Configurações para este tipo de bloco ainda não estão disponíveis
          </p>
        );
    }
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Propriedades</h3>
          <p className="text-xs text-slate-500 capitalize">
            {selectedBlock.type.replace('_', ' ')}
          </p>
        </div>
        <button
          onClick={() => selectBlock(null)}
          className="p-1 hover:bg-slate-100 rounded transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Configurações</h4>
          {renderConfigFields()}
        </div>

        {/* Spacing Controls */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Espaçamento</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Padding Top</label>
              <input
                type="number"
                value={selectedBlock.styles.padding?.top || 0}
                onChange={(e) => updateStyles({
                  padding: { ...selectedBlock.styles.padding, top: parseInt(e.target.value) }
                })}
                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Padding Bottom</label>
              <input
                type="number"
                value={selectedBlock.styles.padding?.bottom || 0}
                onChange={(e) => updateStyles({
                  padding: { ...selectedBlock.styles.padding, bottom: parseInt(e.target.value) }
                })}
                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
