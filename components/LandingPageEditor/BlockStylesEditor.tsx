import React from 'react';
import { BlockStyles } from '../../types/landingPage';

interface BlockStylesEditorProps {
  styles: BlockStyles;
  onUpdate: (styles: BlockStyles) => void;
}

const BlockStylesEditor: React.FC<BlockStylesEditorProps> = ({ styles, onUpdate }) => {
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

      {/* Border Radius */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Border Radius
        </label>
        <input
          type="text"
          value={styles.borderRadius || ''}
          onChange={(e) => updateStyle('borderRadius', e.target.value)}
          placeholder="Ex: 8px"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
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
    </div>
  );
};

export default BlockStylesEditor;
