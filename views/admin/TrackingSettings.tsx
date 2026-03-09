import React, { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { supabase } from '../../services/supabase';
import { Activity, CheckCircle, XCircle, AlertCircle, Save, TestTube } from 'lucide-react';

/**
 * TRACKING SETTINGS COMPONENT
 * Painel de configuração para pixels de tracking
 * Permite habilitar/desabilitar e configurar Facebook Pixel, Google Analytics 4 e Google Ads
 */

interface PixelConfig {
  facebook?: {
    enabled: boolean;
    pixelId: string;
    testMode?: boolean;
  };
  google_analytics?: {
    enabled: boolean;
    measurementId: string;
    testMode?: boolean;
  };
  google_ads?: {
    enabled: boolean;
    conversionId: string;
    conversionLabel?: string;
    testMode?: boolean;
  };
}

const TrackingSettings: React.FC = () => {
  const { settings, refreshSettings } = useSettings();
  const [config, setConfig] = useState<PixelConfig>({
    facebook: { enabled: false, pixelId: '', testMode: false },
    google_analytics: { enabled: false, measurementId: '', testMode: false },
    google_ads: { enabled: false, conversionId: '', conversionLabel: '', testMode: false },
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // Carregar configurações existentes
  useEffect(() => {
    if (settings?.tracking_pixels) {
      setConfig(settings.tracking_pixels);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from('site_settings')
        .update({ tracking_pixels: config })
        .eq('id', settings?.id);

      if (updateError) throw updateError;

      setSaveSuccess(true);
      await refreshSettings();
      
      setTimeout(() => setSaveSuccess(false), 3000);
      
      console.log('✅ Configurações de tracking salvas com sucesso');
    } catch (err: any) {
      console.error('❌ Erro ao salvar configurações:', err);
      setError(err.message || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const testPixel = (pixelType: string) => {
    console.log(`🧪 Testando ${pixelType}...`);
    
    if (pixelType === 'facebook' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
      alert('Evento de teste enviado para Facebook Pixel! Verifique no Facebook Events Manager.');
    } else if (pixelType === 'google_analytics' && (window as any).gtag) {
      (window as any).gtag('event', 'test_event', { event_category: 'Test', event_label: 'Manual Test' });
      alert('Evento de teste enviado para Google Analytics! Verifique no Google Analytics em tempo real.');
    } else if (pixelType === 'google_ads' && (window as any).gtag) {
      (window as any).gtag('event', 'conversion', { send_to: 'test' });
      alert('Evento de teste enviado para Google Ads!');
    } else {
      alert('Pixel não está carregado. Salve as configurações e recarregue a página.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="text-indigo-600" size={32} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tracking & Analytics</h1>
            <p className="text-gray-600">Configure pixels de rastreamento e análise de conversões</p>
          </div>
        </div>

        {/* Facebook Pixel */}
        <div className="border-b pb-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📘</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Facebook Pixel</h2>
                <p className="text-sm text-gray-600">Rastreie conversões do Facebook e Instagram</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.facebook?.enabled || false}
                onChange={(e) => setConfig({
                  ...config,
                  facebook: { ...config.facebook!, enabled: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {config.facebook?.enabled && (
            <div className="space-y-4 ml-15">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pixel ID
                </label>
                <input
                  type="text"
                  value={config.facebook?.pixelId || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    facebook: { ...config.facebook!, pixelId: e.target.value }
                  })}
                  placeholder="123456789012345"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Encontre seu Pixel ID no Facebook Events Manager
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fb-test-mode"
                  checked={config.facebook?.testMode || false}
                  onChange={(e) => setConfig({
                    ...config,
                    facebook: { ...config.facebook!, testMode: e.target.checked }
                  })}
                  className="rounded"
                />
                <label htmlFor="fb-test-mode" className="text-sm text-gray-700">
                  Modo de Teste
                </label>
              </div>

              <button
                onClick={() => testPixel('facebook')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <TestTube size={16} />
                Testar Pixel
              </button>
            </div>
          )}
        </div>

        {/* Google Analytics 4 */}
        <div className="border-b pb-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Google Analytics 4</h2>
                <p className="text-sm text-gray-600">Análise completa de comportamento e conversões</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.google_analytics?.enabled || false}
                onChange={(e) => setConfig({
                  ...config,
                  google_analytics: { ...config.google_analytics!, enabled: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>

          {config.google_analytics?.enabled && (
            <div className="space-y-4 ml-15">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Measurement ID
                </label>
                <input
                  type="text"
                  value={config.google_analytics?.measurementId || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    google_analytics: { ...config.google_analytics!, measurementId: e.target.value }
                  })}
                  placeholder="G-XXXXXXXXXX"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato: G-XXXXXXXXXX (encontre no Google Analytics)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ga-test-mode"
                  checked={config.google_analytics?.testMode || false}
                  onChange={(e) => setConfig({
                    ...config,
                    google_analytics: { ...config.google_analytics!, testMode: e.target.checked }
                  })}
                  className="rounded"
                />
                <label htmlFor="ga-test-mode" className="text-sm text-gray-700">
                  Modo de Debug
                </label>
              </div>

              <button
                onClick={() => testPixel('google_analytics')}
                className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
              >
                <TestTube size={16} />
                Testar Analytics
              </button>
            </div>
          )}
        </div>

        {/* Google Ads */}
        <div className="pb-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Google Ads</h2>
                <p className="text-sm text-gray-600">Rastreamento de conversões para anúncios</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.google_ads?.enabled || false}
                onChange={(e) => setConfig({
                  ...config,
                  google_ads: { ...config.google_ads!, enabled: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          {config.google_ads?.enabled && (
            <div className="space-y-4 ml-15">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conversion ID
                </label>
                <input
                  type="text"
                  value={config.google_ads?.conversionId || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    google_ads: { ...config.google_ads!, conversionId: e.target.value }
                  })}
                  placeholder="AW-XXXXXXXXXX"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conversion Label (Opcional)
                </label>
                <input
                  type="text"
                  value={config.google_ads?.conversionLabel || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    google_ads: { ...config.google_ads!, conversionLabel: e.target.value }
                  })}
                  placeholder="xxxxxxxxxxxx"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={() => testPixel('google_ads')}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <TestTube size={16} />
                Testar Conversão
              </button>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <XCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle size={20} />
            <span>Configurações salvas com sucesso!</span>
          </div>
        )}

        {/* Info Box */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-blue-600 mt-0.5" size={20} />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Como funciona:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Configure os IDs dos pixels acima</li>
                <li>Os pixels serão carregados automaticamente em todas as páginas</li>
                <li>Eventos de conversão serão disparados quando leads forem capturados</li>
                <li>Todos os leads incluirão dados de origem (UTM parameters, referrer, etc)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors font-semibold"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              Salvando...
            </>
          ) : (
            <>
              <Save size={20} />
              Salvar Configurações
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TrackingSettings;
