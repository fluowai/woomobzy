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
  ArrowRight,
  Shield,
  Key
} from 'lucide-react';
import TrackingSettings from './admin/TrackingSettings';
import DomainSettings from './admin/DomainSettings';
import AppearanceSettings from './admin/AppearanceSettings';
import UserManagement from './admin/UserManagement';

const SystemSettings: React.FC = () => {
  const { settings, updateSettings, loading } = useSettings();
  const [openaiKey, setOpenaiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'appearance' | 'users' | 'ai' | 'tracking' | 'domains'
  >('appearance');

  useEffect(() => {
    if (settings?.integrations?.openai?.apiKey) {
      setOpenaiKey(settings.integrations.openai.apiKey);
    }
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
          openai: {
            apiKey: openaiKey,
            model: 'gpt-4o',
          },
          groq: {
            apiKey: groqKey,
            model: 'llama-3.3-70b-versatile',
          },
          gemini: {
            apiKey: geminiKey,
          },
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
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'users', label: 'Membros & Acesso', icon: Users },
    { id: 'domains', label: 'Domínios', icon: Globe },
    { id: 'ai', label: 'IA & Chaves', icon: Brain },
    { id: 'tracking', label: 'Tracking', icon: Activity },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Configurações & Gestão</h1>
          <p className="text-sm text-[#64748B]">Controle completo do seu sistema imobiliário e integrações.</p>
        </div>
        
        {activeTab === 'ai' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary-agro shadow-lg shadow-emerald-500/20"
          >
            {saving ? 'SALVANDO...' : saved ? 'SALVO!' : 'SALVAR CHAVES'}
            {!saving && !saved && <Save size={18} />}
            {saved && <Check size={18} />}
          </button>
        )}
      </div>

      {/* Modern Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] overflow-x-auto custom-scrollbar no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all relative whitespace-nowrap
              ${activeTab === tab.id ? 'text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'}
            `}
          >
            <tab.icon size={18} />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22C55E]" />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[600px] animate-in fade-in duration-500">
        {activeTab === 'appearance' && <AppearanceSettings />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'domains' && <DomainSettings />}
        {activeTab === 'tracking' && <TrackingSettings />}
        
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="card-premium">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-slate-50 text-slate-900 rounded-2xl">
                  <Key size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">API & Inteligência Artificial</h3>
                  <p className="text-xs text-[#64748B]">Configure as chaves secretas para alimentar o IA Studio e automações.</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">OpenAI API Key (GPT-4o)</label>
                    <input
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-..."
                      className="input-premium w-full"
                    />
                    <p className="text-[10px] text-slate-400">Usado para gerações complexas e análise de dossiês.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Gemini API Key (Google)</label>
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="input-premium w-full"
                    />
                    <p className="text-[10px] text-slate-400">Obtenha sua chave gratuita no Google AI Studio.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Groq API Key (Llama 3)</label>
                    <input
                      type="password"
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                      placeholder="gsk_..."
                      className="input-premium w-full"
                    />
                    <p className="text-[10px] text-slate-400">Gerações ultrarrápidas de baixo custo.</p>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
                  <Info size={16} className="text-emerald-600 mt-0.5" />
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    <strong>Dica Premium:</strong> Recomendamos o uso da <strong>Gemini (1.5 Flash)</strong> para custos otimizados e maior velocidade de resposta em atendimentos de chat e descrições técnicas.
                  </p>
                </div>
              </div>
            </div>

            <div className="card-premium">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Segurança & Criptografia</h3>
                    <p className="text-[10px] text-[#64748B]">Suas chaves são armazenadas com criptografia de ponta a ponta.</p>
                  </div>
                </div>
                <button className="text-xs font-bold text-blue-600 hover:underline">Ver Termos</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemSettings;
