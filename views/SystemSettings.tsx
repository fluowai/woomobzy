
import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Save, Brain, Check, Info, Activity, Globe, Palette, Users } from 'lucide-react';
import TrackingSettings from './admin/TrackingSettings';
import DomainSettings from './admin/DomainSettings';
import AppearanceSettings from './admin/AppearanceSettings';
import UserManagement from './admin/UserManagement';

const SystemSettings: React.FC = () => {
  const { settings, updateSettings, loading } = useSettings();
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'appearance' | 'users' | 'ai' | 'tracking' | 'domains'>('appearance');

  useEffect(() => {
    if (settings?.integrations?.groq?.apiKey) {
      setGroqKey(settings.integrations.groq.apiKey);
    }
    if (settings?.integrations?.gemini?.apiKey) {
      setGeminiKey(settings.integrations.gemini.apiKey);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSettings({
        ...settings,
        integrations: {
          ...settings.integrations,
          groq: {
            apiKey: groqKey,
            model: 'llama-3.3-70b-versatile'
          },
          gemini: {
            apiKey: geminiKey
          }
        }
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Configurações & Gestão</h1>
          <p className="text-gray-500">Controle completo do seu sistema imobiliário.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
              ${activeTab === 'appearance'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Palette size={18} />
              Aparência
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('users')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
              ${activeTab === 'users'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Users size={18} />
              Membros & Acesso
            </div>
          </button>

          <button
            onClick={() => setActiveTab('domains')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
              ${activeTab === 'domains'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Globe size={18} />
              Domínios
            </div>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
              ${activeTab === 'ai'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Brain size={18} />
              IA & Chaves
            </div>
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
              ${activeTab === 'tracking'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Activity size={18} />
              Tracking
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'appearance' ? (
            <AppearanceSettings />
        ) : activeTab === 'users' ? (
            <UserManagement />
        ) : activeTab === 'domains' ? (
            <DomainSettings />
        ) : activeTab === 'ai' ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* AI Content same as before but wrapped nicely */}
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Brain size={20} />
                    </div>
                    <div>
                    <h2 className="font-semibold text-gray-800">Inteligência Artificial (Groq AI)</h2>
                    <p className="text-xs text-gray-500">Configure a chave de API da Groq para geração rápida e de baixo custo</p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gemini API Key (Google)
                    </label>
                    <div className="relative">
                        <input
                        type="password"
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        placeholder="Ex: AIzaSy..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                        />
                    </div>
                    <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <Info size={12} />
                        Obtenha gratuitamente no <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a>.
                    </p>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Groq API Key (Opcional / Fallback)
                    </label>
                    <div className="relative">
                        <input
                        type="password"
                        value={groqKey}
                        onChange={(e) => setGroqKey(e.target.value)}
                        placeholder="Ex: gsk_..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                        />
                    </div>
                    <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <Info size={12} />
                        Você pode obter uma chave gratuita no <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Groq Console</a>.
                    </p>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`
                        flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all
                        ${saved 
                            ? 'bg-green-500 text-white hover:bg-green-600' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 shadow-lg'}
                        disabled:opacity-70 disabled:cursor-not-allowed
                        `}
                    >
                        {saving ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Salvando...
                        </>
                        ) : saved ? (
                        <>
                            <Check size={18} />
                            Salvo!
                        </>
                        ) : (
                        <>
                            <Save size={18} />
                            Salvar Configurações
                        </>
                        )}
                    </button>
                    </div>
                </div>
            </div>
        ) : (
            <TrackingSettings />
        )}
      </div>
    </div>
  );
};

export default SystemSettings;
