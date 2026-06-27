import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { oruloService } from '../services/orulo';
import { portalService } from '../services/portals';
import { callApi } from '../src/lib/api';
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
  Bot,
  Wallet,
  Server,
  Gauge,
  RefreshCw,
} from 'lucide-react';
import TrackingSettings from './admin/TrackingSettings';
import DomainSettings from './admin/DomainSettings';
import AppearanceSettings from './admin/AppearanceSettings';
import UserManagement from './admin/UserManagement';
import SupportPortal from './admin/SupportPortal';
import ChannelsSettings from './admin/ChannelsSettings';

type SettingsTab =
  | 'appearance'
  | 'users'
  | 'ai'
  | 'ai-core'
  | 'tracking'
  | 'domains'
  | 'support'
  | 'canais'
  | 'portals';

interface AIModelOption {
  id: string;
  name: string;
  commercial_name?: string;
  model_id: string;
  provider: string;
  engine: string;
  purpose: string;
  status: string;
  priority?: number;
}

interface AIRouteDraft {
  primary_model_id: string;
  fallback_model_id: string;
  temperature: number;
  max_tokens: number;
}

interface AIUsageEntry {
  id: string;
  model_name: string;
  engine: string;
  channel: string;
  operation: string;
  credits_used: number;
  latency_ms?: number;
  status: string;
  created_at: string;
}

const aiRouteOptions = [
  { id: 'default', label: 'Padrao do sistema', description: 'Respostas gerais, assistente e chamadas sem rota especifica.' },
  { id: 'agent_chat', label: 'Agentes comerciais', description: 'Conversas dos agentes e testes manuais.' },
  { id: 'agent_orchestrator', label: 'Orquestrador', description: 'Decisao de intencao, handoff e fluxo operacional.' },
  { id: 'whatsapp_intent', label: 'WhatsApp automatico', description: 'Classificacao e resposta das automacoes do WhatsApp.' },
  { id: 'landing_pages', label: 'Landing pages', description: 'Copy, descricao de imoveis e paginas geradas por IA.' },
  { id: 'documents', label: 'Documentos e OCR', description: 'Dossies, contratos, analises e extracao estruturada.' },
];

const SystemSettings: React.FC = () => {
  const { settings, updateSettings, loading } = useSettings();
  const { profile } = useAuth();
  const location = useLocation();
  const [openaiKey, setOpenaiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [namoBanaKey, setNamoBanaKey] = useState('');
  const [asaasKey, setAsaasKey] = useState('');
  const [zapsignKey, setZapsignKey] = useState('');
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
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    location.pathname.endsWith('/integrations') ? 'ai' : 'appearance'
  );
  const [aiModels, setAiModels] = useState<AIModelOption[]>([]);
  const [aiUsage, setAiUsage] = useState<AIUsageEntry[]>([]);
  const [aiBalance, setAiBalance] = useState<{ balance: number; blocked?: boolean } | null>(null);
  const [aiRouteDraft, setAiRouteDraft] = useState<Record<string, AIRouteDraft>>({});
  const [aiCoreLoading, setAiCoreLoading] = useState(false);
  const [aiCoreError, setAiCoreError] = useState('');

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
    loadPortalConfigs();
  }, [settings]);

  useEffect(() => {
    if (activeTab === 'ai-core') {
      loadAICoreSettings();
    }
  }, [activeTab]);

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

  const buildRouteDraft = (routes: any[], models: AIModelOption[]) => {
    const defaultModel = models.find((model) => model.purpose === 'chat' && model.status === 'active') || models[0];
    const draft: Record<string, AIRouteDraft> = {};

    aiRouteOptions.forEach((option) => {
      const route =
        routes.find((item) => item.route_key === option.id && item.organization_id) ||
        routes.find((item) => item.route_key === option.id);

      draft[option.id] = {
        primary_model_id: route?.primary_model_id || defaultModel?.id || '',
        fallback_model_id: route?.fallback_model_id || '',
        temperature: Number(route?.temperature ?? 0.7),
        max_tokens: Number(route?.max_tokens || 900),
      };
    });

    return draft;
  };

  const loadAICoreSettings = async () => {
    try {
      setAiCoreLoading(true);
      setAiCoreError('');

      const [modelsResult, routesResult, usageResult, creditsResult] = await Promise.all([
        callApi('/api/ai-core/models'),
        callApi('/api/ai-core/routes'),
        callApi('/api/ai-core/usage?limit=20'),
        callApi('/api/ai-core/credits'),
      ]);

      const models = modelsResult.models || [];
      setAiModels(models);
      setAiUsage(usageResult.usage || []);
      setAiBalance(creditsResult.balance || null);
      setAiRouteDraft(buildRouteDraft(routesResult.routes || [], models));
    } catch (error: any) {
      logger.error('Erro ao carregar AI Core', error);
      setAiCoreError(error?.message || 'Nao foi possivel carregar as configuracoes de IA.');
    } finally {
      setAiCoreLoading(false);
    }
  };

  const updateAIRouteDraft = (routeKey: string, patch: Partial<AIRouteDraft>) => {
    setAiRouteDraft((current) => ({
      ...current,
      [routeKey]: {
        ...(current[routeKey] || {
          primary_model_id: '',
          fallback_model_id: '',
          temperature: 0.7,
          max_tokens: 900,
        }),
        ...patch,
      },
    }));
  };

  const handleSaveAICore = async () => {
    try {
      setSaving(true);
      setAiCoreError('');

      await callApi('/api/ai-core/routes', {
        method: 'PUT',
        body: JSON.stringify({
          routes: aiRouteOptions.map((option) => ({
            route_key: option.id,
            purpose: 'chat',
            primary_model_id: aiRouteDraft[option.id]?.primary_model_id || null,
            fallback_model_id: aiRouteDraft[option.id]?.fallback_model_id || null,
            temperature: aiRouteDraft[option.id]?.temperature ?? 0.7,
            max_tokens: aiRouteDraft[option.id]?.max_tokens || 900,
          })),
        }),
      });

      await loadAICoreSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      logger.error('Erro ao salvar AI Core', error);
      setAiCoreError(error?.message || 'Nao foi possivel salvar as rotas de IA.');
    } finally {
      setSaving(false);
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
      const safeIntegrations = { ...(settings.integrations || {}) };
      delete safeIntegrations.orulo;
      await updateSettings({
        ...settings,
        integrations: {
          ...safeIntegrations,
          openai: { apiKey: openaiKey, model: 'gpt-4o' },
          groq: { apiKey: groqKey, model: 'llama-3.3-70b-versatile' },
          gemini: { apiKey: geminiKey },
          namoBana: { apiKey: namoBanaKey },
          asaas: { apiKey: asaasKey, environment: 'production' },
          zapsign: { apiKey: zapsignKey },
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

  const handleDisconnectOruloBroker = async () => {
    try {
      setOruloBrokerConnecting(true);
      await oruloService.disconnectEndUser();
      setOruloBrokerConnected(false);
      setOruloBrokerExpiresAt(null);
    } catch (error) {
      logger.error('Erro ao desconectar corretor Orulo', error);
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

  if (profile?.role === 'broker') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Integração Órulo</h1>
          <p className="mt-2 text-sm text-text-secondary">
            O catálogo da imobiliária já usa a credencial mestre da plataforma.
          </p>
        </div>

        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3">
              <Building2 className="text-sky-500" size={24} />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-text-primary">Minha conta Órulo</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Conecte sua própria conta para acessar contatos comerciais, arquivos, unidades e
                outros dados protegidos.
              </p>

              <div className="mt-5 rounded-xl border border-border-subtle bg-bg-card p-4">
                <p className="text-sm font-semibold text-text-primary">
                  {oruloBrokerConnected ? 'Conta conectada' : 'Conta ainda não conectada'}
                </p>
                {oruloBrokerExpiresAt && (
                  <p className="mt-1 text-xs text-text-secondary">
                    Autorização válida até{' '}
                    {new Date(oruloBrokerExpiresAt).toLocaleString('pt-BR')}.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {oruloBrokerConnected && (
                    <button
                      type="button"
                      onClick={handleDisconnectOruloBroker}
                      disabled={oruloBrokerConnecting}
                      className="btn-secondary disabled:opacity-60"
                    >
                      Desconectar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleConnectOruloBroker}
                    disabled={oruloBrokerConnecting}
                    className="btn-primary disabled:opacity-60"
                  >
                    {oruloBrokerConnecting
                      ? 'Conectando...'
                      : oruloBrokerConnected
                        ? 'Reconectar minha conta'
                        : 'Conectar minha conta'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'users', label: 'Membros & Acesso', icon: Users },
    { id: 'domains', label: 'Domínios', icon: Globe },
    { id: 'ai-core', label: 'IA Local', icon: Bot },
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
        {(activeTab === 'ai' || activeTab === 'portals' || activeTab === 'ai-core') && (
          <button
            onClick={activeTab === 'ai-core' ? handleSaveAICore : handleSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Salvando...' : saved ? (
              <><Check size={16} /> Salvo!</>
            ) : (
              <><Save size={16} /> Salvar{activeTab === 'portals' ? ' Portais' : activeTab === 'ai-core' ? ' IA Local' : ' Chaves'}</>
            )}
          </button>
        )}
      </div>

      {/* Modern Tabs */}
      <div className="flex items-center gap-1 border-b border-border-subtle overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as SettingsTab)}
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
        {activeTab === 'ai-core' && (
          <div className="space-y-6">
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl">
                    <Bot size={24} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-text-primary">IA Local e Roteamento</h3>
                    <p className="text-sm text-text-secondary mt-0.5">
                      Defina quais modelos cada modulo usa e acompanhe saldo, consumo e fallback.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadAICoreSettings}
                  disabled={aiCoreLoading}
                  className="btn-secondary"
                >
                  <RefreshCw size={16} className={aiCoreLoading ? 'animate-spin' : ''} />
                  Atualizar
                </button>
              </div>

              {aiCoreError && (
                <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600">
                  {aiCoreError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-2xl border border-border-subtle bg-bg-primary/40 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-tertiary uppercase tracking-widest">
                    <Wallet size={15} /> Creditos
                  </div>
                  <p className="mt-3 text-2xl font-bold text-text-primary">
                    {Number(aiBalance?.balance || 0).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    {aiBalance?.blocked ? 'Conta bloqueada por saldo' : 'Saldo disponivel'}
                  </p>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-bg-primary/40 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-tertiary uppercase tracking-widest">
                    <Server size={15} /> Modelos
                  </div>
                  <p className="mt-3 text-2xl font-bold text-text-primary">
                    {aiModels.filter((model) => model.status === 'active').length}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">Ativos para esta conta</p>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-bg-primary/40 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-tertiary uppercase tracking-widest">
                    <Activity size={15} /> Chamadas
                  </div>
                  <p className="mt-3 text-2xl font-bold text-text-primary">{aiUsage.length}</p>
                  <p className="text-xs text-text-secondary mt-1">Ultimos registros carregados</p>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-bg-primary/40 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-tertiary uppercase tracking-widest">
                    <Gauge size={15} /> Latencia
                  </div>
                  <p className="mt-3 text-2xl font-bold text-text-primary">
                    {aiUsage.length
                      ? `${Math.round(aiUsage.reduce((sum, item) => sum + Number(item.latency_ms || 0), 0) / aiUsage.length)}ms`
                      : '0ms'}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">Media das chamadas recentes</p>
                </div>
              </div>

              {aiModels.length === 0 ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-amber-700">
                  Nenhum modelo foi encontrado. Cadastre ou sincronize modelos no AI Core antes de salvar rotas.
                </div>
              ) : (
                <div className="space-y-4">
                  {aiRouteOptions.map((route) => {
                    const draft = aiRouteDraft[route.id] || {
                      primary_model_id: '',
                      fallback_model_id: '',
                      temperature: 0.7,
                      max_tokens: 900,
                    };
                    return (
                      <div
                        key={route.id}
                        className="rounded-2xl border border-border-subtle bg-bg-primary/40 p-5"
                      >
                        <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold text-text-primary">{route.label}</h4>
                            <p className="text-xs text-text-secondary mt-1">{route.description}</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[220px_220px_110px_120px] gap-3 w-full xl:w-auto">
                            <select
                              value={draft.primary_model_id}
                              onChange={(event) =>
                                updateAIRouteDraft(route.id, { primary_model_id: event.target.value })
                              }
                              className="input-premium"
                            >
                              <option value="">Modelo principal</option>
                              {aiModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                  {model.commercial_name || model.name || model.model_id}
                                </option>
                              ))}
                            </select>
                            <select
                              value={draft.fallback_model_id}
                              onChange={(event) =>
                                updateAIRouteDraft(route.id, { fallback_model_id: event.target.value })
                              }
                              className="input-premium"
                            >
                              <option value="">Sem fallback</option>
                              {aiModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                  {model.commercial_name || model.name || model.model_id}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="0"
                              max="2"
                              step="0.1"
                              value={draft.temperature}
                              onChange={(event) =>
                                updateAIRouteDraft(route.id, { temperature: Number(event.target.value) })
                              }
                              className="input-premium"
                              title="Temperatura"
                            />
                            <input
                              type="number"
                              min="128"
                              max="8192"
                              step="128"
                              value={draft.max_tokens}
                              onChange={(event) =>
                                updateAIRouteDraft(route.id, { max_tokens: Number(event.target.value) })
                              }
                              className="input-premium"
                              title="Max tokens"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-bg-card border border-border-subtle rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-slate-500/10 border border-slate-500/20 rounded-xl">
                  <Activity size={18} className="text-slate-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Uso recente de IA</h3>
                  <p className="text-xs text-text-secondary">Consumo por modelo, canal e operacao.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-widest text-text-tertiary border-b border-border-subtle">
                      <th className="py-3 pr-4">Modelo</th>
                      <th className="py-3 pr-4">Canal</th>
                      <th className="py-3 pr-4">Operacao</th>
                      <th className="py-3 pr-4">Creditos</th>
                      <th className="py-3 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiUsage.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-text-secondary">
                          Nenhum uso recente registrado.
                        </td>
                      </tr>
                    ) : (
                      aiUsage.map((item) => (
                        <tr key={item.id} className="border-b border-border-subtle/60">
                          <td className="py-3 pr-4 text-text-primary">{item.model_name}</td>
                          <td className="py-3 pr-4 text-text-secondary">{item.channel}</td>
                          <td className="py-3 pr-4 text-text-secondary">{item.operation}</td>
                          <td className="py-3 pr-4 text-text-secondary">
                            {Number(item.credits_used || 0).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 pr-4 text-text-secondary">{item.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
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

                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 space-y-5">
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
                          O catálogo usa a credencial mestre da plataforma, disponível para todas as imobiliárias.
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600">
                      Integração da plataforma
                    </span>
                  </div>

                  <div className="rounded-xl border border-border-subtle bg-bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h5 className="text-xs font-black uppercase tracking-widest text-text-primary">
                        Minha conta Órulo
                      </h5>
                      <p className="mt-1 text-xs text-text-secondary">
                        {oruloBrokerConnected
                          ? `Conta Ã“rulo autorizada${oruloBrokerExpiresAt ? ` atÃ© ${new Date(oruloBrokerExpiresAt).toLocaleString('pt-BR')}` : ''}.`
                          : 'Cada corretor deve conectar a própria conta para consultar contatos, arquivos, unidades e outros dados protegidos.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {oruloBrokerConnected && (
                        <button
                          type="button"
                          onClick={handleDisconnectOruloBroker}
                          disabled={oruloBrokerConnecting}
                          className="btn-secondary text-xs uppercase tracking-widest font-bold disabled:opacity-60"
                        >
                          Desconectar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleConnectOruloBroker}
                        disabled={oruloBrokerConnecting}
                        className="btn-primary text-xs uppercase tracking-widest font-bold disabled:opacity-60"
                      >
                        {oruloBrokerConnecting
                          ? 'Conectando...'
                          : oruloBrokerConnected
                            ? 'Reconectar minha conta'
                            : 'Conectar minha conta'}
                      </button>
                    </div>
                  </div>
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
