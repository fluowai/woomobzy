import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import {
  Save,
  Brain,
  Check,
  Info,
  Globe,
  Palette,
  Users,
  Activity,
  Shield,
  Key,
  Settings,
} from 'lucide-react';
import TrackingSettings from './admin/TrackingSettings';
import DomainSettings from './admin/DomainSettings';
import AppearanceSettings from './admin/AppearanceSettings';
import UserManagement from './admin/UserManagement';
import WhatsAppInstances from './admin/WhatsAppInstances';

const SystemSettings: React.FC = () => {
  const { settings, updateSettings, loading } = useSettings();
  const [openaiKey, setOpenaiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [namoBanaKey, setNamoBanaKey] = useState('');
  const [asaasKey, setAsaasKey] = useState('');
  const [zapsignKey, setZapsignKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'appearance' | 'users' | 'whatsapp' | 'ai' | 'tracking' | 'domains'
  >('appearance');

  useEffect(() => {
    if (settings?.integrations?.openai?.apiKey) setOpenaiKey(settings.integrations.openai.apiKey);
    if (settings?.integrations?.groq?.apiKey) setGroqKey(settings.integrations.groq.apiKey);
    if (settings?.integrations?.gemini?.apiKey) setGeminiKey(settings.integrations.gemini.apiKey);
    if (settings?.integrations?.namoBana?.apiKey) setNamoBanaKey(settings.integrations.namoBana.apiKey);
    if (settings?.integrations?.asaas?.apiKey) setAsaasKey(settings.integrations.asaas.apiKey);
    if (settings?.integrations?.zapsign?.apiKey) setZapsignKey(settings.integrations.zapsign.apiKey);
  }, [settings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSettings({
        ...settings,
        integrations: {
          ...settings.integrations,
          openai: { apiKey: openaiKey, model: 'gpt-4o' },
          groq: { apiKey: groqKey, model: 'llama-3.3-70b-versatile' },
          gemini: { apiKey: geminiKey },
          namoBana: { apiKey: namoBanaKey },
          asaas: { apiKey: asaasKey, environment: 'production' },
          zapsign: { apiKey: zapsignKey },
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const tabs = [
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'users', label: 'Membros & Acesso', icon: Users },
    { id: 'whatsapp', label: 'WhatsApp', icon: Shield },
    { id: 'domains', label: 'Domínios', icon: Globe },
    { id: 'ai', label: 'Integrações 360', icon: Brain },
    { id: 'tracking', label: 'Tracking', icon: Activity },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <span className="p-2 bg-primary/10 rounded-xl border border-primary/20">
              <Settings size={22} className="text-primary" />
            </span>
            Configurações & Gestão
          </h1>
          <p className="text-text-secondary mt-2 ml-1">
            Controle completo do seu sistema imobiliário e integrações.
          </p>
        </div>
        {activeTab === 'ai' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Salvando...' : saved ? (
              <><Check size={16} /> Salvo!</>
            ) : (
              <><Save size={16} /> Salvar Chaves</>
            )}
          </button>
        )}
      </div>

      {/* Modern Tabs */}
      <div className="flex items-center gap-1 border-b border-border-subtle overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all relative whitespace-nowrap rounded-t-lg ${
              activeTab === tab.id
                ? 'text-primary bg-primary/5'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-hover'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[600px]">
        {activeTab === 'appearance' && <AppearanceSettings />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'whatsapp' && <WhatsAppInstances />}
        {activeTab === 'domains' && <DomainSettings />}
        {activeTab === 'tracking' && <TrackingSettings />}

        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* AI Integrations Card */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl">
                  <Key size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">
                    Centro de Integrações 360
                  </h3>
                  <p className="text-sm text-text-secondary mt-0.5">
                    Configure as chaves secretas para unificar Financeiro, Jurídico e IA.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: 'OpenAI API Key (GPT-4o)', value: openaiKey, setter: setOpenaiKey, placeholder: 'sk-...', desc: 'Usado para gerações complexas e análise de dossiês.' },
                    { label: 'Namo Bana AI Key', value: namoBanaKey, setter: setNamoBanaKey, placeholder: 'Chave do cliente...', desc: 'Chave personalizada do cliente para criação assistida por IA.' },
                    { label: 'Gemini API Key (Google)', value: geminiKey, setter: setGeminiKey, placeholder: 'AIzaSy...', desc: 'Obtenha sua chave gratuita no Google AI Studio.' },
                    { label: 'Groq API Key (Llama 3)', value: groqKey, setter: setGroqKey, placeholder: 'gsk_...', desc: 'Gerações ultrarrápidas de baixo custo.' },
                  ].map((field) => (
                    <div key={field.label} className="space-y-2">
                      <label className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">
                        {field.label}
                      </label>
                      <input
                        type="password"
                        value={field.value}
                        onChange={(e) => field.setter(e.target.value)}
                        placeholder={field.placeholder}
                        className="input-premium font-mono"
                      />
                      <p className="text-xs text-text-tertiary">{field.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-border-subtle" />

                <h4 className="text-sm font-semibold text-text-primary uppercase tracking-widest">
                  Módulos de Negócio (360)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: 'Asaas API Key (Financeiro)', value: asaasKey, setter: setAsaasKey, placeholder: '$aas_...', desc: 'Para automação de boletos, PIX e gestão de aluguéis.' },
                    { label: 'ZapSign API Token (Jurídico)', value: zapsignKey, setter: setZapsignKey, placeholder: 'Token de acesso ZapSign', desc: 'Para envio de contratos e assinaturas digitais via WhatsApp.' },
                  ].map((field) => (
                    <div key={field.label} className="space-y-2">
                      <label className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">
                        {field.label}
                      </label>
                      <input
                        type="password"
                        value={field.value}
                        onChange={(e) => field.setter(e.target.value)}
                        placeholder={field.placeholder}
                        className="input-premium font-mono"
                      />
                      <p className="text-xs text-text-tertiary">{field.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Info Banner */}
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3">
                  <Info size={16} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-text-secondary leading-relaxed">
                    <strong className="text-text-primary">Dica Premium:</strong> Recomendamos o uso da{' '}
                    <strong className="text-primary">Gemini (1.5 Flash)</strong> para custos otimizados e
                    maior velocidade de resposta em atendimentos de chat e descrições técnicas.
                  </p>
                </div>
              </div>
            </div>

            {/* Security Card */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                    <Shield size={22} className="text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">
                      Segurança & Criptografia
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Suas chaves são armazenadas com criptografia de ponta a ponta.
                    </p>
                  </div>
                </div>
                <button className="text-xs font-semibold text-primary hover:underline transition-colors">
                  Ver Termos
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemSettings;
