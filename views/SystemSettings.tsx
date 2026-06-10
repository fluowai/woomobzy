import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { oruloService } from '../services/orulo';
import { portalService } from '../services/portals';
import {
  Save,
  Brain,
  Check,
  Info,
  Globe,
  Palette,
  Users,
  Key,
  Settings,
  HelpCircle,
  Activity,
  Shield,
  Link,
  Building2,
} from 'lucide-react';
import TrackingSettings from './admin/TrackingSettings';
import DomainSettings from './admin/DomainSettings';
import AppearanceSettings from './admin/AppearanceSettings';
import UserManagement from './admin/UserManagement';
import SupportPortal from './admin/SupportPortal';
import ChannelsSettings from './admin/ChannelsSettings';

const SystemSettings: React.FC = () => {
  const { settings, updateSettings, loading } = useSettings();
  const location = useLocation();
  const [openaiKey, setOpenaiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [namoBanaKey, setNamoBanaKey] = useState('');
  const [asaasKey, setAsaasKey] = useState('');
  const [zapsignKey, setZapsignKey] = useState('');
  const [oruloEnabled, setOruloEnabled] = useState(false);
  const [oruloClientId, setOruloClientId] = useState('');
  const [oruloClientSecret, setOruloClientSecret] = useState('');
  const [oruloBrokerConnected, setOruloBrokerConnected] = useState(false);
  const [oruloBrokerConnecting, setOruloBrokerConnecting] = useState(false);
  const [oruloBrokerExpiresAt, setOruloBrokerExpiresAt] = useState<string | null>(null);
  const [vivarealEnabled, setVivarealEnabled] = useState(false);
  const [vivarealApiKey, setVivarealApiKey] = useState('');
  const [vivarealPartnerId, setVivarealPartnerId] = useState('');
  const [zapEnabled, setZapEnabled] = useState(false);
  const [zapApiKey, setZapApiKey] = useState('');
  const [zapPartnerId, setZapPartnerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'appearance' | 'users' | 'ai' | 'tracking' | 'domains' | 'support' | 'canais' | 'portals'
  >(location.pathname.endsWith('/integrations') ? 'ai' : 'appearance');

  useEffect(() => {
    if (location.pathname.endsWith('/integrations')) {
      setActiveTab('ai');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (settings?.integrations?.openai?.apiKey) setOpenaiKey(settings.integrations.openai.apiKey);
    if (settings?.integrations?.groq?.apiKey) setGroqKey(settings.integrations.groq.apiKey);
    if (settings?.integrations?.gemini?.apiKey) setGeminiKey(settings.integrations.gemini.apiKey);
    if (settings?.integrations?.namoBana?.apiKey) setNamoBanaKey(settings.integrations.namoBana.apiKey);
    if (settings?.integrations?.asaas?.apiKey) setAsaasKey(settings.integrations.asaas.apiKey);
    if (settings?.integrations?.zapsign?.apiKey) setZapsignKey(settings.integrations.zapsign.apiKey);
    if (settings?.integrations?.orulo) {
      setOruloEnabled(settings.integrations.orulo.enabled ?? false);
      setOruloClientId(settings.integrations.orulo.clientId || '');
      setOruloClientSecret(settings.integrations.orulo.clientSecret || '');
    } else {
      setOruloEnabled(false);
      setOruloClientId('');
      setOruloClientSecret('');
    }
    loadPortalConfigs();
  }, [settings]);

  const loadPortalConfigs = async () => {
    try {
      const vivarealConfig = await portalService.getConfig('vivareal');
      if (vivarealConfig) {
        setVivarealEnabled(vivarealConfig.enabled ?? false);
        setVivarealApiKey(vivarealConfig.apiKey || '');
        setVivarealPartnerId(vivarealConfig.partnerId || '');
      }
      const zapConfig = await portalService.getConfig('zap');
      if (zapConfig) {
        setZapEnabled(zapConfig.enabled ?? false);
        setZapApiKey(zapConfig.apiKey || '');
        setZapPartnerId(zapConfig.partnerId || '');
      }
    } catch (error) {
      logger.error('Erro ao carregar configurações de portais', error);
    }
  };

  useEffect(() => {
    if (!location.pathname.endsWith('/integrations')) return;

    const params = new URLSearchParams(location.search);
    const code = params.get('code');

    const loadStatus = async () => {
      try {
        const status = await oruloService.endUserStatus();
        setOruloBrokerConnected(Boolean(status.connected));
        setOruloBrokerExpiresAt(status.expiresAt || null);
      } catch (error) {
        logger.warn('Erro ao carregar status do corretor Orulo', error);
      }
    };

    const connectWithCode = async () => {
      if (!code) {
        await loadStatus();
        return;
      }

      try {
        setOruloBrokerConnecting(true);
        const redirectUri = `${window.location.origin}${location.pathname}`;
        const result = await oruloService.connectEndUser(code, redirectUri);
        setOruloBrokerConnected(Boolean(result.connected));
        setOruloBrokerExpiresAt(result.expiresAt || null);
        window.history.replaceState({}, document.title, location.pathname);
      } catch (error) {
        logger.error('Erro ao conectar corretor Orulo', error);
      } finally {
        setOruloBrokerConnecting(false);
      }
    };

    connectWithCode();
  }, [location.pathname, location.search]);

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
          orulo: {
            ...(settings.integrations?.orulo || {}),
            enabled: oruloEnabled,
            clientId: oruloClientId.trim(),
            clientSecret: oruloClientSecret.trim(),
          },
        },
      });

      await portalService.saveConfig('vivareal', {
        enabled: vivarealEnabled,
        apiKey: vivarealApiKey.trim(),
        partnerId: vivarealPartnerId.trim(),
      });
      await portalService.saveConfig('zap', {
        enabled: zapEnabled,
        apiKey: zapApiKey.trim(),
        partnerId: zapPartnerId.trim(),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      logger.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleConnectOruloBroker = async () => {
    try {
      setOruloBrokerConnecting(true);
      const redirectUri = `${window.location.origin}${location.pathname}`;
      const result = await oruloService.getEndUserAuthorizeUrl(redirectUri);
      window.location.href = result.authUrl;
    } catch (error) {
      logger.error('Erro ao iniciar OAuth do corretor Orulo', error);
    } finally {
      setOruloBrokerConnecting(false);
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
    { id: 'domains', label: 'Domínios', icon: Globe },
    { id: 'ai', label: 'Integrações 360', icon: Brain },
    { id: 'tracking', label: 'Tracking', icon: Activity },
    { id: 'canais', label: 'Canais', icon: Link },
    { id: 'portals', label: 'Portais', icon: Globe },
    { id: 'support', label: 'Ajuda & Suporte', icon: HelpCircle },
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
        {(activeTab === 'ai' || activeTab === 'portals') && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Salvando...' : saved ? (
              <><Check size={16} /> Salvo!</>
            ) : (
              <><Save size={16} /> Salvar{activeTab === 'portals' ? ' Portais' : ' Chaves'}</>
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
        {activeTab === 'domains' && <DomainSettings />}
        {activeTab === 'tracking' && <TrackingSettings />}
        {activeTab === 'canais' && <ChannelsSettings />}
        {activeTab === 'portals' && (
          <div className="space-y-6">
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                  <Globe size={24} className="text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">
                    Publicação em Portais
                  </h3>
                  <p className="text-sm text-text-secondary mt-0.5">
                    Publique seus imóveis nos maiores portais do Brasil.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-border-subtle bg-bg-primary/40 p-5 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                        <Building2 size={22} className="text-blue-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary">VivaReal</h4>
                        <p className="text-xs text-text-secondary mt-0.5">
                          Credenciais de parceiro VivaReal.
                        </p>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={vivarealEnabled}
                        onChange={(e) => setVivarealEnabled(e.target.checked)}
                        className="sr-only"
                      />
                      <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${vivarealEnabled ? 'bg-primary' : 'bg-slate-300'}`}>
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${vivarealEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                      </span>
                      <span className="text-xs font-semibold text-text-secondary">
                        {vivarealEnabled ? 'Ativa' : 'Inativa'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={vivarealApiKey}
                        onChange={(e) => setVivarealApiKey(e.target.value)}
                        placeholder="Chave da API VivaReal"
                        className="input-premium font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">
                        Partner ID
                      </label>
                      <input
                        type="text"
                        value={vivarealPartnerId}
                        onChange={(e) => setVivarealPartnerId(e.target.value)}
                        placeholder="ID do parceiro"
                        className="input-premium"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border-subtle bg-bg-primary/40 p-5 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                        <Building2 size={22} className="text-amber-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary">Zap Imóveis</h4>
                        <p className="text-xs text-text-secondary mt-0.5">
                          Credenciais de parceiro Zap Imóveis.
                        </p>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={zapEnabled}
                        onChange={(e) => setZapEnabled(e.target.checked)}
                        className="sr-only"
                      />
                      <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${zapEnabled ? 'bg-primary' : 'bg-slate-300'}`}>
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${zapEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                      </span>
                      <span className="text-xs font-semibold text-text-secondary">
                        {zapEnabled ? 'Ativa' : 'Inativa'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={zapApiKey}
                        onChange={(e) => setZapApiKey(e.target.value)}
                        placeholder="Chave da API Zap Imóveis"
                        className="input-premium font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">
                        Partner ID
                      </label>
                      <input
                        type="text"
                        value={zapPartnerId}
                        onChange={(e) => setZapPartnerId(e.target.value)}
                        placeholder="ID do parceiro"
                        className="input-premium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'support' && <SupportPortal />}

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

                <div className="h-px bg-border-subtle" />

                <div className="rounded-2xl border border-border-subtle bg-bg-primary/40 p-5 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-2xl">
                        <Building2 size={22} className="text-sky-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary">
                          Órulo Catálogo Urbano
                        </h4>
                        <p className="text-xs text-text-secondary mt-0.5">
                          Credenciais exclusivas desta imobiliária para importar empreendimentos e tipologias.
                        </p>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={oruloEnabled}
                        onChange={(e) => setOruloEnabled(e.target.checked)}
                        className="sr-only"
                      />
                      <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${oruloEnabled ? 'bg-primary' : 'bg-slate-300'}`}>
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${oruloEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                      </span>
                      <span className="text-xs font-semibold text-text-secondary">
                        {oruloEnabled ? 'Ativa' : 'Inativa'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">
                        Client ID
                      </label>
                      <input
                        type="password"
                        value={oruloClientId}
                        onChange={(e) => setOruloClientId(e.target.value)}
                        placeholder="Client ID fornecido pela Órulo"
                        className="input-premium font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">
                        Client Secret
                      </label>
                      <input
                        type="password"
                        value={oruloClientSecret}
                        onChange={(e) => setOruloClientSecret(e.target.value)}
                        placeholder="Client Secret fornecido pela Órulo"
                        className="input-premium font-mono"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-text-tertiary">
                    Ao clicar em "Importar Órulo" no módulo urbano, o sistema usa estas credenciais apenas para a organização atual.
                  </p>
                </div>

                  <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h5 className="text-xs font-black uppercase tracking-widest text-text-primary">
                        Corretor conectado
                      </h5>
                      <p className="mt-1 text-xs text-text-secondary">
                        {oruloBrokerConnected
                          ? `Conta Ã“rulo autorizada${oruloBrokerExpiresAt ? ` atÃ© ${new Date(oruloBrokerExpiresAt).toLocaleString('pt-BR')}` : ''}.`
                          : 'Conecte o corretor para consultar contatos, arquivos e dados protegidos em tempo real.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleConnectOruloBroker}
                      disabled={oruloBrokerConnecting || !oruloEnabled}
                      className="btn-secondary text-xs uppercase tracking-widest font-bold disabled:opacity-60"
                    >
                      {oruloBrokerConnecting
                        ? 'Conectando...'
                        : oruloBrokerConnected
                          ? 'Reconectar Corretor'
                          : 'Conectar Corretor'}
                    </button>
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
