import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { callApi, setActiveOrganizationId } from '../src/lib/api';
import { supabase } from '../services/supabase';
import {
  Building2,
  Tractor,
  Home,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Loader2,
  Mail,
  Lock,
  User,
  Zap,
  Globe,
  Smartphone,
} from 'lucide-react';
import { getTenantBaseUrl } from '../utils/platform';
import { instanceApi, type Instance } from './WhatsApp/hooks/api';
import QRCodeModal from './WhatsApp/QRCodeModal';

const SITE_TEMPLATES = {
  rural: [
    {
      id: 'r1',
      name: 'Fazenda Premium',
      color: 'emerald',
      image: '/templates/template_lifestyle.png',
    },
    {
      id: 'r2',
      name: 'Agro Business',
      color: 'green',
      image: '/templates/template_production.png',
    },
    {
      id: 'r3',
      name: 'Haras & Sítios',
      color: 'amber',
      image: '/templates/template_tractor_soil.png',
    },
  ],
  urban: [
    {
      id: 'u1',
      name: 'Urbano Minimal',
      color: 'slate',
      image: '/templates/urban/urban_apartment_center.png',
    },
    {
      id: 'u2',
      name: 'City Connect',
      color: 'blue',
      image: '/templates/urban/urban_exclusive_launch.png',
    },
    {
      id: 'u3',
      name: 'Família & Lar',
      color: 'indigo',
      image: '/templates/urban/urban_gated_community.png',
    },
  ],
};

const WHATSAPP_INSTANCE_NAME = 'WhatsApp';

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);

  // WhatsApp (Etapa 2)
  const [qrInstance, setQrInstance] = useState<Instance | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrDone, setQrDone] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    agencyName: '',
    cnpj: '',
    niche: 'urban' as 'rural' | 'urban',
    template: '',
  });

  const update = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleCreateAccount = async () => {
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.agencyName ||
      !formData.template
    ) {
      setError('Preencha todos os campos obrigatórios e escolha um template.');
      return;
    }
    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await callApi('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          agencyName: formData.agencyName,
          profileType: formData.niche === 'rural' ? 'rural' : 'traditional',
          plan: 'pro',
          parent_id: settings.id, // Reseller ID
        }),
      });

      // Auto-login para permitir criar a instância do WhatsApp na etapa seguinte
      if (data?.organization) {
        const { data: signIn, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });
        if (!signInError && signIn?.user) {
          setActiveOrganizationId(data.organization.id, signIn.user.id);
        }
      }

      setSuccess(data);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Cria a instância do WhatsApp ao entrar na etapa 2
  useEffect(() => {
    if (step !== 2 || qrDone || qrInstance || qrLoading) return;
    if (!success?.organization) return;

    const boot = async () => {
      setQrLoading(true);
      setError('');
      try {
        const inst = await instanceApi.create(WHATSAPP_INSTANCE_NAME);
        setQrInstance(inst);
      } catch (err: any) {
        setError(
          err.message ||
            'Não foi possível iniciar a conexão do WhatsApp. Você pode conectar depois pelo painel.'
        );
      } finally {
        setQrLoading(false);
      }
    };
    boot();
  }, [step, qrDone, qrInstance, qrLoading, success]);

  const handleQrClose = async () => {
    setQrDone(true);
    if (qrInstance) {
      try {
        const fresh = await instanceApi.get(qrInstance.id);
        setQrInstance(fresh);
      } catch {
        // status permanece o atual
      }
    }
  };

  // =====================================
  // UI STEPS
  // =====================================

  const renderStep1 = () => (
    <div className="animate-fade-in-slide space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">
          Crie a sua Imobiliária Digital
        </h2>
        <p className="text-slate-500 mt-2">
          Leva menos de 2 minutos. Você ajusta tudo depois no painel.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
            Seu Nome *
          </label>
          <div className="relative">
            <User
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={formData.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-colors"
              placeholder="Nome completo"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
            Email Profissional *
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-colors"
              placeholder="seu@email.com.br"
            />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
            Nome da Imobiliária *
          </label>
          <div className="relative">
            <Building2
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={formData.agencyName}
              onChange={(e) => update('agencyName', e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-colors"
              placeholder="Ex: Nobre Imóveis"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
            Senha Segura *
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="password"
              value={formData.password}
              onChange={(e) => update('password', e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-colors"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">
          Qual é o seu foco principal?
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => update('niche', 'urban')}
            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.niche === 'urban' ? 'border-[var(--color-primary)] bg-[var(--color-primary-alpha-10)]' : 'border-slate-100 bg-white hover:border-slate-200'}`}
          >
            <Home
              size={24}
              className={
                formData.niche === 'urban'
                  ? 'text-[var(--color-primary)]'
                  : 'text-slate-400'
              }
            />
            <span
              className={`font-bold ${formData.niche === 'urban' ? 'text-[var(--color-primary)]' : 'text-slate-600'}`}
            >
              Urbano
            </span>
          </button>
          <button
            onClick={() => update('niche', 'rural')}
            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.niche === 'rural' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
          >
            <Tractor
              size={24}
              className={
                formData.niche === 'rural'
                  ? 'text-emerald-600'
                  : 'text-slate-400'
              }
            />
            <span
              className={`font-bold ${formData.niche === 'rural' ? 'text-emerald-900' : 'text-slate-600'}`}
            >
              Rural
            </span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">
          Escolha o Tema do seu Site *
        </label>
        <div className="grid grid-cols-3 gap-3">
          {SITE_TEMPLATES[formData.niche].map((t) => (
            <button
              key={t.id}
              onClick={() => update('template', t.id)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${formData.template === t.id ? 'border-[var(--color-primary)] bg-[var(--color-primary-alpha-10)]' : 'border-slate-100 bg-white hover:border-slate-200'}`}
            >
              {t.image ? (
                <div
                  className={`w-full h-24 rounded-lg mb-2 border overflow-hidden ${formData.template === t.id ? `border-${t.color}-500 ring-2 ring-${t.color}-500/20` : `border-slate-200`}`}
                >
                  <img
                    src={t.image}
                    alt={t.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className={`w-full h-24 rounded-lg bg-${t.color}-100 mb-2 border border-${t.color}-200`}
                />
              )}
              <p className="text-xs font-bold text-slate-700 text-center">
                {t.name}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    if (qrInstance && !qrDone) {
      return (
        <QRCodeModal instance={qrInstance} onClose={handleQrClose} />
      );
    }

    return renderStep2Content();
  };

  const renderStep2Content = () => (
    <div className="animate-fade-in-slide space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageSquare size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Conexão WhatsApp</h2>
        <p className="text-slate-500 mt-2">
          Conecte o WhatsApp da imobiliária para o atendimento funcionar.
        </p>
      </div>

      {qrDone ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center">
            <CheckCircle2 size={32} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-900">
              {qrInstance?.status === 'connected'
                ? 'WhatsApp conectado!'
                : 'WhatsApp adiado'}
            </h3>
            <p className="text-sm text-emerald-700 mt-1">
              {qrInstance?.status === 'connected'
                ? 'Seu atendimento já está ativo.'
                : 'Você pode conectar o WhatsApp depois pelo painel em Conexões.'}
            </p>
          </div>
        </div>
      ) : qrLoading ? (
        <div className="bg-slate-50 p-10 rounded-2xl border border-slate-200 flex flex-col items-center text-center space-y-3">
          <Loader2 size={40} className="animate-spin text-emerald-500" />
          <p className="font-bold text-slate-700">Preparando o WhatsApp...</p>
          <span className="text-sm text-slate-400">
            Aguarde alguns segundos
          </span>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center">
            <Smartphone size={40} className="text-slate-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">
              Não foi possível conectar agora
            </h3>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
          </div>
          <button
            onClick={() => {
              setQrDone(true);
              setError('');
            }}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            Continuar sem conectar
          </button>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => {
    const slug = formData.agencyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const panelUrl = success?.panelUrl || (formData.niche === 'rural' ? '/rural' : '/urban');

    return (
      <div className="animate-fade-in-scale text-center space-y-6 py-8">
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-200">
          <CheckCircle2 size={48} className="text-white" />
        </div>

        <div>
          <h2 className="text-3xl font-bold text-slate-900">Tudo Pronto!</h2>
          <p className="text-slate-500 mt-2 text-lg">
            Sua infraestrutura de vendas foi gerada.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left space-y-4 max-w-md mx-auto">
          {qrInstance && (
            <div className="flex items-center gap-3">
              <MessageSquare size={20} className="text-emerald-500" />
              <span className="font-bold text-slate-700">
                WhatsApp Conectado
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-amber-500" />
            <span className="font-bold text-slate-700">
              IA Configurada e Pronta
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Globe size={20} className="text-blue-500" />
            <div>
              <span className="font-bold text-slate-700 block">
                Seu Site Oficial
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {getTenantBaseUrl(slug)}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate(panelUrl)}
          className="w-full max-w-md mx-auto bg-slate-900 text-white p-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
        >
          Acessar Meu Painel →
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-blue-100">
      <div className="w-full max-w-2xl">
        {/* Header Progress */}
        {step < 3 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Passo {step} de 2
              </span>
              <span className="text-xs font-bold text-[var(--color-primary)]">
                {step === 1 && 'Conta'}
                {step === 2 && 'WhatsApp'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
                style={{ width: `${(step / 2) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Content Box */}
        <div
          className={`bg-white rounded-[2rem] shadow-2xl shadow-slate-900/5 p-8 md:p-10 border border-slate-100 ${step === 3 ? 'border-emerald-100 bg-gradient-to-b from-emerald-50/50 to-white' : ''}`}
        >
          {error && step !== 2 && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-600" />
              {error}
            </div>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {/* Footer Controls */}
          {step === 1 && (
            <div className="mt-10 flex items-center justify-between pt-6 border-t border-slate-100">
              <span className="text-xs text-slate-300">Seguro e criptografado</span>

              <button
                onClick={handleCreateAccount}
                disabled={loading}
                className="bg-[var(--color-primary)] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 disabled:opacity-70 shadow-lg shadow-black/10"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    Criar Conta
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          )}

          {step === 2 && !qrInstance && (
            <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Ir para login
              </button>

              <button
                onClick={() => setStep(3)}
                className="bg-[var(--color-primary)] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-black/10"
              >
                Continuar
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 2 && qrInstance && (
            <div className="mt-8 flex items-center justify-end pt-6 border-t border-slate-100">
              {!qrDone && (
                <button
                  onClick={() => setQrDone(true)}
                  className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Pular por enquanto
                </button>
              )}
              {qrDone && (
                <button
                  onClick={() => setStep(3)}
                  className="bg-[var(--color-primary)] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-black/10"
                >
                  Continuar
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
