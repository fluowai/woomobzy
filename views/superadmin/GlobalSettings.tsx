import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { Key, Save, Server, AlertTriangle } from 'lucide-react';

const GlobalSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    global_openai_key: '',
    global_gemini_key: '',
    maintenance_mode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('saas_settings')
        .select('*')
        .single();

      if (data) setSettings(data);
    } catch (error) {
      console.error('Error fetching global settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { id, created_at, ...updates } = settings as any;
      const payload = { id: 1, ...updates };

      const { data, error } = await supabase
        .from('saas_settings')
        .upsert(payload)
        .select();

      if (error) throw error;

      alert('Configurações salvas com sucesso! ✅');
    } catch (error: any) {
      console.error('Save Error:', error);
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Key className="text-red-600" />
          Configurações Globais (Master API Keys)
        </h1>
        <button
          onClick={(e) => handleSave(e)}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 shadow-sm"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <Save size={20} />
          )}
          Salvar Agora
        </button>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-6"
      >
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
          <div className="flex">
            <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm text-yellow-700">
                Estas chaves são compartilhadas entre todas as organizações.
                Cada organização pode configurar suas próprias chaves nas
                configurações do site.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Server size={20} /> Inteligência Artificial
          </h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OpenAI API Key (GPT-4)
              </label>
              <input
                type="password"
                value={settings.global_openai_key || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    global_openai_key: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Gemini API Key
              </label>
              <input
                type="password"
                value={settings.global_gemini_key || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    global_gemini_key: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Groq API Key (Llama 3)
              </label>
              <input
                type="password"
                value={(settings as any).global_groq_key || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    global_groq_key: e.target.value,
                  } as any)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.maintenance_mode}
              onChange={(e) =>
                setSettings({ ...settings, maintenance_mode: e.target.checked })
              }
              className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
            />
            <span className="text-gray-700 font-medium">
              Modo Manutenção (Bloqueia acesso de todos os tenants)
            </span>
          </label>
        </div>

        <div className="pt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Save size={20} />
            )}
            Salvar Configurações Globais
          </button>
        </div>
      </form>
    </div>
  );
};

export default GlobalSettings;
