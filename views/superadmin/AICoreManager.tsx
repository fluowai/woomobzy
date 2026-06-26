import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle,
  Cpu,
  Database,
  Gauge,
  MessageSquare,
  RefreshCw,
  Server,
  Sparkles,
  Wallet,
  XCircle,
} from 'lucide-react';
import { callApi } from '../../src/lib/api';

interface AICoreHealth {
  success: boolean;
  service: string;
  ollama: string;
  error?: string;
}

interface AIModel {
  id: string;
  name: string;
  commercial_name?: string;
  provider: string;
  engine: string;
  model_id: string;
  purpose: string;
  status: string;
  priority: number;
  context_window?: number;
  credit_multiplier?: number;
}

interface AIUsageLog {
  id: string;
  model_name: string;
  engine: string;
  channel: string;
  operation: string;
  credits_used: number;
  latency_ms: number;
  status: string;
  error_message?: string;
  created_at: string;
}

interface AIBalance {
  balance: number;
  blocked: boolean;
}

const AICoreManager: React.FC = () => {
  const [health, setHealth] = useState<AICoreHealth | null>(null);
  const [models, setModels] = useState<AIModel[]>([]);
  const [usage, setUsage] = useState<AIUsageLog[]>([]);
  const [balance, setBalance] = useState<AIBalance | null>(null);
  const [prompt, setPrompt] = useState('Tenho interesse em uma casa em Palmas. Pode me ajudar?');
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [healthResult, modelsResult, usageResult, creditsResult] = await Promise.allSettled([
        callApi('/api/ai-core/health'),
        callApi('/api/ai-core/models'),
        callApi('/api/ai-core/usage?limit=25'),
        callApi('/api/ai-core/credits'),
      ]);

      if (healthResult.status === 'fulfilled') setHealth(healthResult.value);
      if (modelsResult.status === 'fulfilled') setModels(modelsResult.value.models || []);
      if (usageResult.status === 'fulfilled') setUsage(usageResult.value.usage || []);
      if (creditsResult.status === 'fulfilled') setBalance(creditsResult.value.balance || null);

      const failures = [healthResult, modelsResult, usageResult, creditsResult]
        .filter((result) => result.status === 'rejected')
        .map((result: any) => result.reason?.message)
        .filter(Boolean);
      if (failures.length) setError(failures[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const chatModels = models.filter((model) => model.purpose === 'chat');
  const embeddingModels = models.filter((model) => model.purpose === 'embedding');
  const activeModels = models.filter((model) => model.status === 'active');
  const totalCredits = usage.reduce((sum, item) => sum + Number(item.credits_used || 0), 0);
  const avgLatency = usage.length
    ? Math.round(usage.reduce((sum, item) => sum + Number(item.latency_ms || 0), 0) / usage.length)
    : 0;

  const status = useMemo(() => {
    if (!health) return { label: 'Verificando', tone: 'slate', icon: Activity };
    if (health.success && health.ollama === 'online') return { label: 'Online', tone: 'emerald', icon: CheckCircle };
    if (health.ollama === 'unhealthy') return { label: 'Instável', tone: 'amber', icon: AlertTriangle };
    return { label: 'Offline', tone: 'red', icon: XCircle };
  }, [health]);

  const runTest = async () => {
    setTesting(true);
    setTestResult('');
    setError('');
    try {
      const response = await callApi('/api/ai-core/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: prompt,
          channel: 'superadmin',
          systemInstruction: 'Voce e um corretor imobiliario consultivo da IMOBZY. Responda curto.',
          temperature: 0.3,
          max_tokens: 220,
        }),
      });
      setTestResult(response.text || response.response || '');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Falha ao testar o AI Core.');
    } finally {
      setTesting(false);
    }
  };

  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
            <Bot className="text-red-600" size={28} />
            IA Local
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Modelos auto-hospedados, consumo, créditos e testes do IMOBZY AI Core.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={StatusIcon} label="Ollama" value={status.label} tone={status.tone} />
        <Metric icon={Cpu} label="Modelos ativos" value={`${activeModels.length}/${models.length}`} tone="blue" />
        <Metric icon={Wallet} label="Créditos usados" value={totalCredits.toLocaleString('pt-BR')} tone="violet" />
        <Metric icon={Gauge} label="Latência média" value={avgLatency ? `${avgLatency}ms` : 'Sem uso'} tone="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Modelos cadastrados</h2>
              <p className="text-xs font-medium text-slate-500">
                Chat: {chatModels.length} · Embeddings: {embeddingModels.length}
              </p>
            </div>
            <Database size={20} className="text-slate-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-3">Modelo</th>
                  <th className="px-5 py-3">Engine</th>
                  <th className="px-5 py-3">Uso</th>
                  <th className="px-5 py-3">Contexto</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {models.map((model) => (
                  <tr key={model.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">{model.commercial_name || model.name}</p>
                      <p className="text-xs text-slate-500">{model.model_id}</p>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-600">{model.engine}</td>
                    <td className="px-5 py-4 font-medium text-slate-600">{model.purpose}</td>
                    <td className="px-5 py-4 font-medium text-slate-600">
                      {(model.context_window || 0).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill status={model.status} />
                    </td>
                  </tr>
                ))}
                {!models.length && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm font-medium text-slate-400">
                      Nenhum modelo encontrado. Verifique a migration `ai_models`.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Teste rápido</h2>
              <p className="text-xs font-medium text-slate-500">Chama `/api/ai-core/chat`.</p>
            </div>
            <Sparkles size={20} className="text-red-500" />
          </div>

          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="h-32 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
          />
          <button
            type="button"
            onClick={runTest}
            disabled={testing || !prompt.trim()}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-60"
          >
            <MessageSquare size={16} />
            {testing ? 'Testando...' : 'Testar IA Local'}
          </button>

          <div className="mt-4 min-h-32 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {testResult || 'A resposta do modelo local aparecerá aqui.'}
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Uso recente</h2>
            <p className="text-xs font-medium text-slate-500">
              Saldo atual: {Number(balance?.balance || 0).toLocaleString('pt-BR')} créditos
              {balance?.blocked ? ' · bloqueado' : ''}
            </p>
          </div>
          <Server size={20} className="text-slate-400" />
        </div>
        <div className="divide-y divide-slate-100">
          {usage.map((item) => (
            <div key={item.id} className="grid gap-3 p-5 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
              <div>
                <p className="font-bold text-slate-900">{item.model_name || 'modelo não registrado'}</p>
                <p className="text-xs font-medium text-slate-500">
                  {item.channel || 'api'} · {item.operation} · {new Date(item.created_at).toLocaleString('pt-BR')}
                </p>
                {item.error_message && <p className="mt-1 text-xs text-red-600">{item.error_message}</p>}
              </div>
              <span className="text-sm font-bold text-slate-600">{item.engine}</span>
              <span className="text-sm font-bold text-slate-600">{Number(item.credits_used || 0)} créditos</span>
              <StatusPill status={item.status} />
            </div>
          ))}
          {!usage.length && (
            <div className="p-10 text-center text-sm font-medium text-slate-400">
              Nenhum uso registrado ainda.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  tone: string;
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className={`mb-4 inline-flex rounded-lg p-2 ${tones[tone] || tones.slate}`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase text-slate-400">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const clean = String(status || '').toLowerCase();
  const className = clean === 'active' || clean === 'success'
    ? 'bg-emerald-50 text-emerald-700'
    : clean === 'available'
      ? 'bg-blue-50 text-blue-700'
      : clean === 'error' || clean === 'failed' || clean === 'offline'
        ? 'bg-red-50 text-red-700'
        : 'bg-slate-100 text-slate-600';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase ${className}`}>
      {status || 'unknown'}
    </span>
  );
}

export default AICoreManager;

