import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { oruloService } from '../../services/orulo';
import {
  Key,
  Save,
  Server,
  AlertTriangle,
  Building2,
  CheckCircle2,
} from 'lucide-react';

const GlobalSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    global_openai_key: '',
    global_gemini_key: '',
    maintenance_mode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [oruloClientId, setOruloClientId] = useState('');
  const [oruloClientSecret, setOruloClientSecret] = useState('');
  const [oruloStatus, setOruloStatus] = useState<{
    configured: boolean;
    clientId?: string;
    source?: string;
    updatedAt?: string | null;
  }>({ configured: false });
  const [byobSettings, setByobSettings] = useState({
    domain: '',
    supabase_url: '',
    supabase_anon_key: '',
    supabase_service_role_key: '',
    minio_endpoint: '',
    minio_access_key: '',
    minio_secret_key: '',
    minio_bucket_name: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [{ data }, masterStatus, { data: byobData }] = await Promise.all([
        supabase.from('saas_settings').select('*').single(),
        oruloService.getMasterCredentials().catch(() => ({
          configured: false,
        })),
        supabase.from('reseller_infrastructure').select('*').single(),
      ]);

      if (data) setSettings(data);
      if (byobData) setByobSettings(byobData);
      setOruloStatus(masterStatus);
    } catch (error) {
      logger.error('Error fetching global settings:', error);
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

      // Save BYOB settings
      if (byobSettings.domain && byobSettings.supabase_url) {
        // Obter organization_id do superadmin atual
        const { data: userProfile } = await supabase.from('profiles').select('organization_id').single();
        if (userProfile?.organization_id) {
            const { error: byobError } = await supabase
              .from('reseller_infrastructure')
              .upsert({ ...byobSettings, organization_id: userProfile.organization_id }, { onConflict: 'organization_id' });
            if (byobError) throw byobError;
        }
      }

      if (oruloClientId.trim() || oruloClientSecret.trim()) {
        if (!oruloClientId.trim() || !oruloClientSecret.trim()) {
          throw new Error('Preencha Client ID e Client Secret da Órulo.');
        }

        const masterStatus = await oruloService.saveMasterCredentials(
          oruloClientId.trim(),
          oruloClientSecret.trim()
        );
        setOruloStatus(masterStatus);
        setOruloClientId('');
        setOruloClientSecret('');
      }

      alert('Configurações salvas com sucesso! ✅');
    } catch (error: any) {
      logger.error('Save Error:', error);
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

        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Building2 size={20} /> Órulo — credencial mestre da plataforma
          </h3>

          <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-4">
            <div className="flex items-start gap-3">
              {oruloStatus.configured ? (
                <CheckCircle2 className="mt-0.5 text-emerald-600" size={20} />
              ) : (
                <AlertTriangle className="mt-0.5 text-amber-600" size={20} />
              )}
              <div>
                <p className="font-semibold text-gray-800">
                  {oruloStatus.configured
                    ? 'Credencial mestre configurada'
                    : 'Credencial mestre ainda não configurada'}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Esta credencial libera o catálogo para todas as imobiliárias.
                  Cada corretor conecta a própria conta separadamente para
                  acessar dados protegidos.
                </p>
                {oruloStatus.clientId && (
                  <p className="mt-2 text-xs font-mono text-gray-500">
                    Client ID atual: {oruloStatus.clientId}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client ID mestre
              </label>
              <input
                type="password"
                value={oruloClientId}
                onChange={(event) => setOruloClientId(event.target.value)}
                placeholder={
                  oruloStatus.configured
                    ? 'Informe para substituir'
                    : 'Client ID da Órulo'
                }
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Secret mestre
              </label>
              <input
                type="password"
                value={oruloClientSecret}
                onChange={(event) => setOruloClientSecret(event.target.value)}
                placeholder={
                  oruloStatus.configured
                    ? 'Informe para substituir'
                    : 'Client Secret da Órulo'
                }
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* BYOB (Bring Your Own Backend) */}
        <div className="pt-6 border-t border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Server size={20} className="text-blue-600" /> Infraestrutura Customizada (BYOB)
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Se preenchido, os acessos neste domínio serão roteados para o seu próprio Supabase e MinIO em vez do banco de dados central (Master).
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seu Domínio (Ex: painel.suaimobiliaria.com.br)
              </label>
              <input
                type="text"
                value={byobSettings?.domain || ''}
                onChange={(e) =>
                  setByobSettings({ ...byobSettings, domain: e.target.value })
                }
                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500"
                placeholder="Seu domínio personalizado..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supabase URL
              </label>
              <input
                type="text"
                value={byobSettings?.supabase_url || ''}
                onChange={(e) =>
                  setByobSettings({ ...byobSettings, supabase_url: e.target.value })
                }
                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500"
                placeholder="https://sua-instancia.supabase.co"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supabase Anon Key
              </label>
              <input
                type="password"
                value={byobSettings?.supabase_anon_key || ''}
                onChange={(e) =>
                  setByobSettings({ ...byobSettings, supabase_anon_key: e.target.value })
                }
                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500"
                placeholder="eyJhbG..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supabase Service Role Key
              </label>
              <input
                type="password"
                value={byobSettings?.supabase_service_role_key || ''}
                onChange={(e) =>
                  setByobSettings({ ...byobSettings, supabase_service_role_key: e.target.value })
                }
                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500"
                placeholder="Chave para permissões administrativas (Backend)"
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
