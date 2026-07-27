import React from 'react';
import { BlockStyles } from '../../types/landingPage';

interface BlockStylesEditorProps {
  styles: BlockStyles;
  onUpdate: (styles: BlockStyles) => void;
}

const BlockStylesEditor: React.FC<BlockStylesEditorProps> = ({
  styles,
  onUpdate,
}) => {
  const updateStyle = (key: keyof BlockStyles, value: any) => {
    onUpdate({ ...styles, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Padding */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Padding
        </label>
        <input
          type="text"
          value={styles.padding || ''}
          onChange={(e) => updateStyle('padding', e.target.value)}
          placeholder="Ex: 40px 20px"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Formato: top right bottom left (ex: 40px 20px)
        </p>
      </div>

      {/* Margin */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Margin
        </label>
        <input
          type="text"
          value={styles.margin || ''}
          onChange={(e) => updateStyle('margin', e.target.value)}
          placeholder="Ex: 20px 0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Background Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cor de Fundo
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={styles.backgroundColor || '#ffffff'}
            onChange={(e) => updateStyle('backgroundColor', e.target.value)}
            className="h-10 w-20 rounded border border-gray-300"
          />
          <input
            type="text"
            value={styles.backgroundColor || ''}
            onChange={(e) => updateStyle('backgroundColor', e.target.value)}
            placeholder="#ffffff"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Text Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cor do Texto
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={styles.textColor || '#000000'}
            onChange={(e) => updateStyle('textColor', e.target.value)}
            className="h-10 w-20 rounded border border-gray-300"
          />
          <input
            type="text"
            value={styles.textColor || ''}
            onChange={(e) => updateStyle('textColor', e.target.value)}
            placeholder="#000000"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tamanho da Fonte
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min="10"
            max="72"
            value={parseInt(styles.fontSize || '16')}
            onChange={(e) => updateStyle('fontSize', `${e.target.value}px`)}
            className="flex-1"
          />
          <input
            type="text"
            value={styles.fontSize || ''}
            onChange={(e) => updateStyle('fontSize', e.target.value)}
            placeholder="Ex: 16px"
            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>

      {/* Font Weight */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Peso da Fonte
        </label>
        <select
          value={styles.fontWeight || ''}
          onChange={(e) => updateStyle('fontWeight', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Padrão</option>
          <option value="300">Fino (300)</option>
          <option value="400">Normal (400)</option>
          <option value="500">Médio (500)</option>
          <option value="600">Semi Bold (600)</option>
          <option value="700">Bold (700)</option>
          <option value="800">Extra Bold (800)</option>
          <option value="900">Black (900)</option>
        </select>
      </div>

      {/* Line Height */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Altura da Linha
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min="1"
            max="3"
            step="0.1"
            value={parseFloat(styles.lineHeight || '1.5')}
            onChange={(e) => updateStyle('lineHeight', e.target.value)}
            className="flex-1"
          />
          <input
            type="text"
            value={styles.lineHeight || ''}
            onChange={(e) => updateStyle('lineHeight', e.target.value)}
            placeholder="1.5"
            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>

      {/* Letter Spacing */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Espaçamento das Letras
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min="-2"
            max="10"
            step="0.5"
            value={parseFloat(styles.letterSpacing || '0')}
            onChange={(e) => updateStyle('letterSpacing', `${e.target.value}px`)}
            className="flex-1"
          />
          <input
            type="text"
            value={styles.letterSpacing || ''}
            onChange={(e) => updateStyle('letterSpacing', e.target.value)}
            placeholder="0px"
            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Border Radius
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min="0"
            max="100"
            value={parseInt(styles.borderRadius || '0')}
            onChange={(e) => updateStyle('borderRadius', `${e.target.value}px`)}
            className="flex-1"
          />
          <input
            type="text"
            value={styles.borderRadius || ''}
            onChange={(e) => updateStyle('borderRadius', e.target.value)}
            placeholder="Ex: 8px"
            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>

      {/* Border */}
      <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Borda
        </p>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[10px] text-gray-500 mb-1">
              Espessura
            </label>
            <input
              type="text"
              value={styles.borderWidth || ''}
              onChange={(e) => updateStyle('borderWidth', e.target.value)}
              placeholder="1px"
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] text-gray-500 mb-1">
              Estilo
            </label>
            <select
              value={styles.borderStyle || 'none'}
              onChange={(e) => updateStyle('borderStyle', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="none">Nenhum</option>
              <option value="solid">Sólido</option>
              <option value="dashed">Tracejado</option>
              <option value="dotted">Pontilhado</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            Cor da Borda
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={styles.borderColor || '#000000'}
              onChange={(e) => updateStyle('borderColor', e.target.value)}
              className="h-8 w-12 rounded border border-gray-300"
            />
            <input
              type="text"
              value={styles.borderColor || ''}
              onChange={(e) => updateStyle('borderColor', e.target.value)}
              placeholder="#000000"
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Box Shadow */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Box Shadow
        </label>
        <select
          value={styles.boxShadow || 'none'}
          onChange={(e) => updateStyle('boxShadow', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="none">Nenhuma</option>
          <option value="0 1px 3px rgba(0,0,0,0.1)">Pequena</option>
          <option value="0 4px 6px rgba(0,0,0,0.1)">Média</option>
          <option value="0 10px 15px rgba(0,0,0,0.1)">Grande</option>
          <option value="0 20px 25px rgba(0,0,0,0.1)">Extra Grande</option>
        </select>
      </div>

      {/* Text Align */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Alinhamento do Texto
        </label>
        <div className="grid grid-cols-4 gap-2">
          {['left', 'center', 'right', 'justify'].map((align) => (
            <button
              key={align}
              onClick={() => updateStyle('textAlign', align)}
              className={`px-3 py-2 border rounded-lg text-sm capitalize transition-colors ${
                styles.textAlign === align
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
              }`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      {/* Width */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Largura
        </label>
        <input
          type="text"
          value={styles.width || ''}
          onChange={(e) => updateStyle('width', e.target.value)}
          placeholder="Ex: 100% ou 800px"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Height */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Altura
        </label>
        <input
          type="text"
          value={styles.height || ''}
          onChange={(e) => updateStyle('height', e.target.value)}
          placeholder="Ex: auto ou 400px"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Advanced CSS */}
      <div className="pt-4 border-t border-gray-200">
        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
          CSS Personalizado
        </label>
        <textarea
          value={styles.customCss || ''}
          onChange={(e) => updateStyle('customCss', e.target.value)}
          placeholder="Ex: filter: grayscale(1); z-index: 10;"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default BlockStylesEditor;
