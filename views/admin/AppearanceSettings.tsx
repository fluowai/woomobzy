import React, { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import {
  Save,
  Check,
  Upload,
  Palette,
  Layout,
  Type,
  Globe,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { extractColorsFromImage } from '../../utils/colors';

const AppearanceSettings: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const [formData, setFormData] = useState({
    agencyName: '',
    primaryColor: '#000000',
    secondaryColor: '#000000',
    headerColor: '#ffffff',
    logoUrl: '',
    logoHeight: 80,
    fontFamily: 'Inter, sans-serif',
    isLive: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        agencyName: settings.agencyName || '',
        primaryColor: settings.primaryColor || '#1e3a8a',
        secondaryColor: settings.secondaryColor || '#1e40af',
        headerColor: settings.headerColor || '#ffffff',
        logoUrl: settings.logoUrl || '',
        logoHeight: settings.logoHeight || 80,
        fontFamily: settings.fontFamily || 'Inter, sans-serif',
        isLive: settings.isLive ?? false,
      });
      setLogoPreview(settings.logoUrl || null);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSettings({
        ...settings,
        ...formData,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Erro ao salvar aparência.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const { data, error } = await supabase.storage
        .from('logos')
        .upload(fileName, file);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('logos').getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, logoUrl: publicUrl }));
      setLogoPreview(publicUrl);

      // Auto-detect colors from the uploaded logo
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = publicUrl;

        const colors = await extractColorsFromImage(img);

        if (colors) {
          setFormData((prev) => ({
            ...prev,
            logoUrl: publicUrl,
            primaryColor: colors.primary,
            secondaryColor: colors.secondary,
          }));
          alert(
            '✨ Cores detectadas e aplicadas automaticamente a partir da sua logo!'
          );
        }
      } catch (colorError) {
        console.error('Info: Could not auto-detect colors', colorError);
        // Non-blocking error
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert(
        'Erro ao fazer upload da logo. Verifique se o bucket "logos" existe e é público.'
      );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
          <Palette size={20} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-800">Aparência do Site</h2>
          <p className="text-xs text-gray-500">
            Personalize cores, logo e identidade visual.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Site Status Control */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Globe
                size={18}
                className={
                  formData.isLive ? 'text-emerald-500' : 'text-orange-500'
                }
              />
              Status de Visibilidade do Site
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {formData.isLive
                ? 'Seu site está ONLINE para o público geral.'
                : 'Seu site está em MODO MANUTENÇÃO. Apenas administradores podem visualizá-lo.'}
            </p>
          </div>
          <button
            onClick={() =>
              setFormData({ ...formData, isLive: !formData.isLive })
            }
            className={`
              relative inline-flex h-8 w-14 items-center rounded-full transition-colors outline-none
              ${formData.isLive ? 'bg-emerald-500' : 'bg-slate-300'}
            `}
          >
            <span
              className={`
                inline-block h-6 w-6 transform rounded-full bg-white transition-transform
                ${formData.isLive ? 'translate-x-7' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* Agency Settings */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Layout size={16} /> Identidade
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Imobiliária
              </label>
              <input
                type="text"
                value={formData.agencyName}
                onChange={(e) =>
                  setFormData({ ...formData, agencyName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Colors */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Palette size={16} /> Cores
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor Primária
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryColor: e.target.value })
                  }
                  className="h-10 w-10 rounded border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryColor: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Botões, destaques, links.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor Secundária
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) =>
                    setFormData({ ...formData, secondaryColor: e.target.value })
                  }
                  className="h-10 w-10 rounded border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) =>
                    setFormData({ ...formData, secondaryColor: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Bordas, detalhes sutis.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor do Header
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.headerColor}
                  onChange={(e) =>
                    setFormData({ ...formData, headerColor: e.target.value })
                  }
                  className="h-10 w-10 rounded border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.headerColor}
                  onChange={(e) =>
                    setFormData({ ...formData, headerColor: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Fundo do menu superior.
              </p>
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Logo */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Upload size={16} /> Logo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload da Logo
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-2">
                  <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center">
                    <Upload size={24} />
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-indigo-600">
                      Clique para enviar
                    </span>{' '}
                    ou arraste
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG ou SVG (Max 2MB)
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pré-visualização
              </label>
              <div
                className="h-32 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-100 overflow-hidden"
                style={{ backgroundColor: formData.headerColor }}
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo Preview"
                    style={{
                      height: `${formData.logoHeight}px`,
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <span className="text-gray-400 text-sm">Sem logo</span>
                )}
              </div>
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Altura da Logo (px)
                </label>
                <input
                  type="range"
                  min="30"
                  max="150"
                  value={formData.logoHeight}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      logoHeight: Number(e.target.value),
                    })
                  }
                  className="w-full accent-indigo-600"
                />
                <span className="text-xs text-gray-500">
                  {formData.logoHeight}px
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`
                            flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all
                            ${
                              saved
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                            }
                            disabled:opacity-70 disabled:cursor-not-allowed
                        `}
          >
            {saving ? (
              'Salvando...'
            ) : saved ? (
              <>
                <Check size={18} /> Salvo!
              </>
            ) : (
              <>
                <Save size={18} /> Salvar Alterações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;
