import React, { useState } from 'react';
import { LandingPageTheme } from '../../types/landingPage';
import { X, Palette } from 'lucide-react';

interface ThemeCustomizerProps {
  themeConfig: LandingPageTheme;
  onUpdate: (theme: LandingPageTheme) => void;
  onClose: () => void;
}

const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ themeConfig, onUpdate, onClose }) => {
  const [theme, setTheme] = useState<LandingPageTheme>(themeConfig);

  const updateTheme = (updates: Partial<LandingPageTheme>) => {
    const newTheme = { ...theme, ...updates };
    setTheme(newTheme);
    onUpdate(newTheme);
  };

  const updateFontSize = (key: keyof LandingPageTheme['fontSize'], value: string) => {
    updateTheme({
      fontSize: {
        ...theme.fontSize,
        [key]: value
      }
    });
  };

  const updateSpacing = (key: keyof LandingPageTheme['spacing'], value: string) => {
    updateTheme({
      spacing: {
        ...theme.spacing,
        [key]: value
      }
    });
  };

  const googleFonts = [
    'Inter',
    'Poppins',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Raleway',
    'Playfair Display',
    'Merriweather',
    'Nunito',
    'Lora'
  ];

  const themePresets = [
    {
      name: 'Padrão Profissional',
      colors: { primaryColor: '#2563eb', secondaryColor: '#4f46e5', backgroundColor: '#ffffff', textColor: '#111827' },
      fonts: { fontFamily: 'Inter', headingFontFamily: 'Poppins' }
    },
    {
      name: 'Fazenda dos Sonhos',
      colors: { primaryColor: '#4a5d23', secondaryColor: '#8b9c7a', backgroundColor: '#fdfbf7', textColor: '#333333', accentColor: '#d4af37' },
      fonts: { fontFamily: 'Inter', headingFontFamily: 'Lora' }
    }
  ];

  const applyPreset = (preset: any) => {
    updateTheme({
      ...preset.colors,
      ...preset.fonts
    });
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Palette className="text-blue-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">Customizar Tema</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Templates de Tema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {themePresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className="text-left">
                    <p className="font-bold text-gray-900">{preset.name}</p>
                    <div className="flex gap-1 mt-2">
                       <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.colors.primaryColor }} />
                       <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.colors.secondaryColor }} />
                       <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.colors.backgroundColor }} />
                    </div>
                  </div>
                  <Palette size={20} className="text-gray-400 group-hover:text-blue-600" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Cores */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cores</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor Primária
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={theme.primaryColor}
                    onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor Secundária
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={theme.secondaryColor}
                    onChange={(e) => updateTheme({ secondaryColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={theme.secondaryColor}
                    onChange={(e) => updateTheme({ secondaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor de Destaque
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={theme.accentColor || '#f59e0b'}
                    onChange={(e) => updateTheme({ accentColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={theme.accentColor || '#f59e0b'}
                    onChange={(e) => updateTheme({ accentColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor de Fundo
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={theme.backgroundColor}
                    onChange={(e) => updateTheme({ backgroundColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={theme.backgroundColor}
                    onChange={(e) => updateTheme({ backgroundColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor do Texto
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={theme.textColor}
                    onChange={(e) => updateTheme({ textColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={theme.textColor}
                    onChange={(e) => updateTheme({ textColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Tipografia */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tipografia</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fonte Principal
                </label>
                <select
                  value={theme.fontFamily}
                  onChange={(e) => updateTheme({ fontFamily: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {googleFonts.map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fonte dos Títulos
                </label>
                <select
                  value={theme.headingFontFamily || theme.fontFamily}
                  onChange={(e) => updateTheme({ headingFontFamily: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {googleFonts.map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamanho Base
                </label>
                <input
                  type="text"
                  value={theme.fontSize.base}
                  onChange={(e) => updateFontSize('base', e.target.value)}
                  placeholder="16px"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamanho H1
                </label>
                <input
                  type="text"
                  value={theme.fontSize.heading1}
                  onChange={(e) => updateFontSize('heading1', e.target.value)}
                  placeholder="48px"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamanho H2
                </label>
                <input
                  type="text"
                  value={theme.fontSize.heading2}
                  onChange={(e) => updateFontSize('heading2', e.target.value)}
                  placeholder="36px"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamanho H3
                </label>
                <input
                  type="text"
                  value={theme.fontSize.heading3}
                  onChange={(e) => updateFontSize('heading3', e.target.value)}
                  placeholder="24px"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Espaçamentos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Espaçamentos</h3>

              {(Object.keys(theme.spacing) as Array<keyof typeof theme.spacing>).map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                    {key}
                  </label>
                  <input
                    type="text"
                    value={theme.spacing[key as keyof typeof theme.spacing]}
                    onChange={(e) => updateSpacing(key as keyof typeof theme.spacing, e.target.value)}
                    placeholder="16px"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />

                </div>
              ))}
            </div>

            {/* Border Radius */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bordas</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Border Radius
                </label>
                <input
                  type="text"
                  value={theme.borderRadius}
                  onChange={(e) => updateTheme({ borderRadius: e.target.value })}
                  placeholder="8px"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
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

export default ThemeCustomizer;
