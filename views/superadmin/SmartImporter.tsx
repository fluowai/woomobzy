import React, { useState } from 'react';
import {
  Zap,
  Globe,
  ShieldCheck,
  Palette,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Layout,
  Database,
  FileJson,
  AlertCircle,
  Hash,
  Type,
  Paintbrush,
  Crown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MOCK_IDENTITY = {
  palette: ['#1e293b', '#3b82f6', '#f8fafc', '#64748b', '#0f172a'],
  fonts: ['Inter', 'system-ui'],
  primaryColor: '#1e293b',
  secondaryColor: '#3b82f6',
  suggestedTheme: 'modern',
};
import { supabase } from '../../services/supabase';
import {
  ImportMode,
  ImportStatus,
  ImportJob,
  VisualIdentity,
  CapturedProperty,
} from '../../types/import';
import VisualPreview from '../../components/importer/VisualPreview';
import PropertyReviewTable from '../../components/importer/PropertyReviewTable';

const SmartImporter: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState(
    () => sessionStorage.getItem('importer_url') || ''
  );
  const [authorized, setAuthorized] = useState(false);
  const [mode, setMode] = useState<ImportMode>('migration');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState(
    () => sessionStorage.getItem('importer_org_id') || ''
  );
  const [capturedProperties, setCapturedProperties] = useState<
    CapturedProperty[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  // Persistence effects
  React.useEffect(() => {
    sessionStorage.setItem('importer_url', url);
  }, [url]);

  React.useEffect(() => {
    sessionStorage.setItem('importer_org_id', selectedOrgId);
  }, [selectedOrgId]);

  // Fetch organizations for the selector
  React.useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
        const response = await fetch(`${apiUrl}/api/admin/organizations`, {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });
        const data = await response.json();
        if (data.success) {
          setOrganizations(data.organizations);
          if (data.organizations.length > 0)
            setSelectedOrgId(data.organizations[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch organizations:', err);
      }
    };
    fetchOrgs();
  }, []);

  const handleStart = () => {
    if (!url || !authorized || !selectedOrgId) return;
    setStep(2);
  };

  const startAnalysis = async () => {
    setStatus('analyzing');
    setError(null);
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const response = await fetch(`${apiUrl}/api/import/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ url, organizationId: selectedOrgId }),
      });

      const data = await response.json();
      if (data.success) {
        setCapturedProperties(data.properties);
        setStep(5); // Jump to review table
      } else {
        throw new Error(data.error || 'Falha na análise');
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    } finally {
      setStatus('idle');
    }
  };

  const finalizeImport = async () => {
    setStatus('importing');
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const response = await fetch(`${apiUrl}/api/import/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          properties: capturedProperties,
          organizationId: selectedOrgId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStep(6);
      } else {
        throw new Error(data.error || 'Erro ao finalizar importação');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStatus('idle');
    }
  };

  React.useEffect(() => {
    console.log('🔄 [SmartImporter] Step changed to:', step, 'Status:', status);
    if (step === 3) {
      console.log(
        '⏳ [SmartImporter] Starting auto-advance timer for Step 4...'
      );
      const timer = setTimeout(() => {
        console.log('🚀 [SmartImporter] Auto-advancing to Step 4');
        setStep(4);
      }, 4000);
      return () => {
        console.log('🧹 [SmartImporter] Cleaning up timer');
        clearTimeout(timer);
      };
    }
  }, [step, status]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Zap className="text-white" size={24} />
            </div>
            Importador Inteligente
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Migração automatizada e extração de identidade visual com IA.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div
              key={s}
              className={`w-8 h-1 rounded-full transition-all ${s <= step ? 'bg-indigo-600' : 'bg-slate-200'}`}
            />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/50 min-h-[500px] flex flex-col overflow-hidden">
        {step === 1 && (
          <div className="p-12 flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center animate-bounce duration-[3s]">
              <Globe size={48} />
            </div>
            <div className="max-w-lg space-y-4">
              <h2 className="text-4xl font-black text-slate-900 leading-tight">
                Vamos migrar para a{' '}
                <span className="text-indigo-600 italic">IMOBZY</span>?
              </h2>
              <p className="text-slate-500 text-lg">
                Selecione a conta de destino e a URL do site original.
              </p>
            </div>

            <div className="w-full max-w-xl space-y-4">
              {/* Organization Selector */}
              <div className="text-left space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">
                  Conta de Destino (Migrar para...)
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-indigo-600 outline-none transition-all appearance-none cursor-pointer"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Globe size={20} />
                </div>
                <input
                  type="url"
                  placeholder="https://www.imobiliaria.com.br"
                  className="w-full pl-12 pr-4 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg font-medium focus:border-indigo-600 outline-none transition-all"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              <label className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left cursor-pointer group">
                <input
                  type="checkbox"
                  className="mt-1 w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  checked={authorized}
                  onChange={(e) => setAuthorized(e.target.checked)}
                />
                <span className="text-sm text-amber-900 leading-relaxed font-medium">
                  Declaro que possuo <strong>autorização formal</strong> para
                  migrar os dados deste site ou que sou o proprietário legal do
                  conteúdo. Prometo respeitar os termos de serviço da origem.
                </span>
              </label>

              <button
                onClick={handleStart}
                disabled={!url || !authorized}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-xl font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
              >
                Analisar Site <ArrowRight size={24} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-12 flex-1 animate-in slide-in-from-right duration-300">
            <div className="mb-12">
              <h2 className="text-3xl font-black text-slate-900 mb-2">
                Como deseja proceder?
              </h2>
              <p className="text-slate-500">
                Escolha o modo de importação ideal para este projeto.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {[
                {
                  id: 'visual',
                  icon: Palette,
                  title: 'Inspiração Visual',
                  desc: 'Captura paleta, tipografia e estilo sem importar imóveis.',
                  color: 'blue',
                },
                {
                  id: 'migration',
                  icon: Zap,
                  title: 'Migração Direta',
                  desc: 'Extração completa de imóveis, páginas e identidade via IA.',
                  color: 'indigo',
                },
                {
                  id: 'feed',
                  icon: Database,
                  title: 'Feed / Arquivo',
                  desc: 'Importação estruturada via XML, CSV ou Planilhas.',
                  color: 'emerald',
                },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as ImportMode)}
                  className={`p-6 rounded-3xl border-2 text-left transition-all group ${
                    mode === m.id
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]'
                      : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'
                  }`}
                >
                  <div
                    className={`p-3 rounded-2xl w-fit mb-4 transition-colors ${
                      mode === m.id
                        ? 'bg-white/20'
                        : 'bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                    }`}
                  >
                    <m.icon size={28} />
                  </div>
                  <h3 className="text-xl font-black mb-2">{m.title}</h3>
                  <p
                    className={`text-sm leading-relaxed ${mode === m.id ? 'text-indigo-100' : 'text-slate-500'}`}
                  >
                    {m.desc}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center bg-slate-50 -mx-12 -mb-12 p-8 border-t border-slate-100">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-6 py-3 text-slate-500 font-bold hover:text-slate-900 transition-all"
              >
                <ArrowLeft size={20} /> Voltar
              </button>
              <button
                onClick={() => {
                  if (mode === 'feed') {
                    setStep(2.5);
                  } else {
                    startAnalysis();
                  }
                }}
                disabled={status === 'analyzing'}
                className="px-10 py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-black transition-all shadow-lg"
              >
                {status === 'analyzing' ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ShieldCheck size={20} />
                )}
                Confirmar & Iniciar
              </button>
            </div>
          </div>
        )}

        {step === 2.5 && (
          <div className="p-12 flex-1 animate-in slide-in-from-right duration-300">
            <div className="mb-12">
              <h2 className="text-3xl font-black text-slate-900 mb-2">
                Upload de Dados
              </h2>
              <p className="text-slate-500">
                Selecione o arquivo estruturado para importação.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer group">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                  <FileJson size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">
                    Arraste seu arquivo
                  </h4>
                  <p className="text-sm text-slate-400">
                    Suporta XML (Zap/VivaReal), CSV ou JSON.
                  </p>
                </div>
                <input type="file" className="hidden" />
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <AlertCircle size={18} className="text-amber-500" />
                    Dicas de Importação
                  </h4>
                  <ul className="text-sm text-slate-500 space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle2
                        size={16}
                        className="text-green-500 mt-0.5 shrink-0"
                      />
                      Use o formato padrão ZAP para garantir 100% de mapeamento.
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2
                        size={16}
                        className="text-green-500 mt-0.5 shrink-0"
                      />
                      Imagens devem conter URLs públicas acessíveis.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-50 -mx-12 -mb-12 p-8 border-t border-slate-100 mt-12">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-3 text-slate-500 font-bold hover:text-slate-900 transition-all"
              >
                <ArrowLeft size={20} /> Voltar
              </button>
              <button
                onClick={() => setStep(5)}
                className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-lg"
              >
                Continuar para Revisão <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-20 flex-1 flex flex-col items-center justify-center text-center space-y-10">
            {/* ... (previous analysis content) ... */}
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-600/10 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative w-32 h-32 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl">
                <Loader2 size={64} className="animate-spin" />
              </div>
            </div>

            <div className="space-y-4 max-w-lg">
              <h2 className="text-4xl font-black text-slate-900">
                A Inteligência está trabalhando...
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed">
                Estamos analisando a estrutura do site{' '}
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-sm">
                  {url}
                </span>{' '}
                para extrair dados limpos.
              </p>
            </div>

            <div className="w-full max-w-md space-y-3">
              {[
                { label: 'Analisando Identidade Visual', status: 'done' },
                { label: 'Mapeando Sitemap & Páginas', status: 'running' },
                { label: 'Extraindo Lista de Imóveis', status: 'pending' },
                { label: 'Normalizando Campos com IA', status: 'pending' },
              ].map((task, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all"
                >
                  <span
                    className={`text-sm font-bold ${task.status === 'done' ? 'text-green-600' : task.status === 'running' ? 'text-indigo-600' : 'text-slate-400'}`}
                  >
                    {task.label}
                  </span>
                  {task.status === 'done' ? (
                    <CheckCircle2 size={18} className="text-green-500" />
                  ) : task.status === 'running' ? (
                    <Loader2
                      size={18}
                      className="text-indigo-600 animate-spin"
                    />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-200" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="p-12 flex-1 animate-in zoom-in-95 duration-500">
            <VisualPreview
              identity={MOCK_IDENTITY}
              onAccept={() => setStep(mode === 'visual' ? 6 : 5)}
              onRetry={() => setStep(3)}
            />
          </div>
        )}

        {step === 5 && (
          <div className="p-12 flex-1 animate-in slide-in-from-right duration-500">
            <PropertyReviewTable
              properties={capturedProperties}
              onConfirm={finalizeImport}
              onBack={() => setStep(2)}
            />
          </div>
        )}

        {step === 6 && (
          <div className="p-20 flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100">
              <CheckCircle2 size={48} />
            </div>
            <div className="max-w-md space-y-4">
              <h2 className="text-4xl font-black text-slate-900 leading-tight">
                Importação Concluída!
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed">
                Os dados foram integrados com sucesso. O catálogo agora conta
                com os novos imóveis e a identidade visual foi aplicada.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="px-8 py-4 border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all font-black uppercase tracking-widest text-sm"
              >
                Nova Importação
              </button>
              <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 font-black uppercase tracking-widest text-sm">
                Ver Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex flex-col md:flex-row gap-6 p-6 bg-slate-900/5 rounded-3xl border border-slate-200/50">
        <div className="flex-1 flex gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600 h-fit">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">Sobre o Limite Legal</h4>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              O IMOBZY respeita as políticas de bots de terceiros. Se
              encontrarmos bloqueios severos ou CAPTCHA, recomendamos o uso da
              importação por Feed XML padrão ZAP/VivaReal.
            </p>
          </div>
        </div>
        <div className="flex-1 flex gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600 h-fit">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">Privacidade Garantida</h4>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              Os dados capturados ficam em ambiente isolado (Staging) e só são
              integrados à sua conta após sua revisão e aprovação manual.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartImporter;
