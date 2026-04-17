import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Palette,
  User,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Globe,
  Wheat,
  Home,
  Crown,
  Zap,
  Shield,
  Star,
  BarChart3,
  MessageCircle,
  Map,
  FileText,
  Eye,
  ChevronDown,
  Lock,
  Mail,
  Phone,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';

// ==========================================
// PLAN DEFINITIONS
// ==========================================
const PLANS = [
  {
    id: 'free',
    name: 'Starter',
    price: 0,
    period: 'Grátis para sempre',
    description: 'Ideal para começar',
    color: 'from-slate-500 to-slate-700',
    border: 'border-slate-200',
    features: [
      '1 Corretor',
      'Até 15 Imóveis',
      'Landing Page Básica',
      'CRM Simples',
      'Subdomínio gratuito',
    ],
    limits: { brokers: 1, properties: 15 },
    popular: false,
  },
  {
    id: 'basic',
    name: 'Profissional',
    price: 97,
    period: '/mês',
    description: 'Para imobiliárias em crescimento',
    color: 'from-emerald-500 to-emerald-700',
    border: 'border-emerald-300',
    features: [
      'Até 5 Corretores',
      'Até 100 Imóveis',
      'Site Premium Completo',
      'CRM + Kanban',
      'WhatsApp Integrado',
      'Editor Visual',
      'Subdomínio .imobzy.com.br',
    ],
    limits: { brokers: 5, properties: 100 },
    popular: false,
  },
  {
    id: 'pro',
    name: 'Enterprise',
    price: 197,
    period: '/mês',
    description: 'Para operações avançadas',
    color: 'from-amber-500 to-amber-700',
    border: 'border-amber-300',
    features: [
      'Corretores Ilimitados',
      'Imóveis Ilimitados',
      'IA Integrada (Gemini)',
      'Geointeligência + Mapas',
      'Due Diligence Digital',
      'Portal do Proprietário',
      'BI + Relatórios',
      'Domínio Personalizado',
      'Suporte Prioritário',
    ],
    limits: { brokers: -1, properties: -1 },
    popular: true,
  },
];

// ==========================================
// PROFILE TYPES
// ==========================================
const PROFILES = [
  {
    id: 'rural',
    name: 'Imobiliária Rural',
    icon: Wheat,
    description:
      'Fazendas, sítios, chácaras, haras, áreas agrícolas e pecuárias',
    color: 'from-green-600 to-emerald-800',
    features: ['Geointeligência', 'Mapas SIGEF/CAR', 'Due Diligence Rural'],
  },
  {
    id: 'traditional',
    name: 'Imobiliária Tradicional',
    icon: Home,
    description: 'Casas, apartamentos, terrenos, lançamentos e locação',
    color: 'from-blue-600 to-indigo-800',
    features: ['Catálogo Premium', 'Portais Integrados', 'Gestão de Locação'],
  },
  {
    id: 'hybrid',
    name: 'Híbrida',
    icon: Crown,
    description: 'Comercializa imóveis rurais e urbanos',
    color: 'from-purple-600 to-violet-800',
    features: ['Todos os recursos Rural + Urbano', 'Flexibilidade total'],
  },
];

// ==========================================
// MAIN COMPONENT
// ==========================================
const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSystemSetup, setIsSystemSetup] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);

  React.useEffect(() => {
    checkSystem();
  }, []);

  const checkSystem = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch('/api/system-status', { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        console.warn('⚠️ Backend returned error:', res.status);
        return;
      }
      
      const data = await res.json();
      console.log('✅ Backend connected. Fresh system:', data.fresh);
      if (data.fresh) {
        setIsSystemSetup(true);
        setStep(3); // Go straight to account
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.warn('⚠️ Backend check timed out (server may not be running)');
      } else {
        console.warn('⚠️ Backend unavailable:', e.message);
      }
    }
  };

  const [formData, setFormData] = useState({
    // Plan
    plan: '',
    // Profile
    profileType: '',
    // User
    name: '',
    email: '',
    password: '',
    // Organization
    agencyName: '',
    creci: '',
    phone: '',
    whatsapp: '',
    region: '',
    // Branding
    primaryColor: '#064e3b',
    secondaryColor: '#d4af37',
    logoUrl: '',
  });

  const totalSteps = isSystemSetup ? 3 : 5;

  const update = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!formData.plan || isSystemSetup;
      case 2:
        return !!formData.profileType || isSystemSetup;
      case 3:
        return (
          !!formData.email &&
          !!formData.password &&
          formData.password.length >= 6
        );
      case 4:
        return !!formData.agencyName || isSystemSetup;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar conta');
      }

      setSuccess(data);
      setStep(6); // Success step
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STEP 1: Plan Selection
  // ==========================================
  const renderPlanStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900">
          Escolha seu Plano
        </h2>
        <p className="text-slate-500 mt-1">
          Comece gratuitamente e escale quando precisar
        </p>
        <button
          onClick={() => {
            setIsSystemSetup(true);
            setStep(3);
          }}
          className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-bold underline"
        >
          Eu sou o proprietário do sistema
        </button>
      </div>

      <div className="grid gap-4">
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            onClick={() => update('plan', plan.id)}
            className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
              formData.plan === plan.id
                ? `${plan.border} bg-white shadow-lg scale-[1.02]`
                : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
                Mais Popular
              </div>
            )}

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center`}
                  >
                    {plan.id === 'free' ? (
                      <Zap size={16} className="text-white" />
                    ) : plan.id === 'basic' ? (
                      <Star size={16} className="text-white" />
                    ) : (
                      <Crown size={16} className="text-white" />
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800">{plan.name}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {plan.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {plan.features.slice(0, 4).map((f, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full"
                    >
                      {f}
                    </span>
                  ))}
                  {plan.features.length > 4 && (
                    <span className="text-[10px] text-slate-400">
                      +{plan.features.length - 4} mais
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="text-2xl font-black text-slate-900">
                  {plan.price === 0 ? 'Grátis' : `R$${plan.price}`}
                </div>
                <div className="text-xs text-slate-400">{plan.period}</div>
              </div>
            </div>

            {formData.plan === plan.id && (
              <div className="absolute top-4 left-4">
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  // ==========================================
  // STEP 2: Profile Type
  // ==========================================
  const renderProfileStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900">Tipo de Operação</h2>
        <p className="text-slate-500 mt-1">
          Selecionamos os recursos ideais para você
        </p>
      </div>

      <div className="grid gap-4">
        {PROFILES.map((profile) => {
          const Icon = profile.icon;
          return (
            <button
              key={profile.id}
              onClick={() => update('profileType', profile.id)}
              className={`text-left p-6 rounded-2xl border-2 transition-all duration-300 ${
                formData.profileType === profile.id
                  ? 'border-emerald-300 bg-emerald-50/50 shadow-lg shadow-emerald-50'
                  : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${profile.color} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">
                    {profile.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {profile.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {profile.features.map((f, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-medium"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ==========================================
  // STEP 3: Account Creation
  // ==========================================
  const renderAccountStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900">
          {isSystemSetup ? 'Configuração do Proprietário' : 'Crie sua Conta'}
        </h2>
        <p className="text-slate-500 mt-1">
          {isSystemSetup
            ? 'Defina os dados de acesso do Dono do Sistema'
            : 'Dados de acesso ao painel administrativo'}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
            Seu Nome
          </label>
          <div className="relative">
            <User
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-emerald-500 focus:bg-white transition-colors outline-none text-slate-700"
              placeholder="Seu nome completo"
              value={formData.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="email"
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-emerald-500 focus:bg-white transition-colors outline-none text-slate-700"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
            Senha
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="password"
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-emerald-500 focus:bg-white transition-colors outline-none text-slate-700"
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </div>
          {formData.password && formData.password.length < 6 && (
            <p className="text-xs text-red-500 mt-1">
              A senha precisa ter pelo menos 6 caracteres
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // ==========================================
  // STEP 4: Organization Details
  // ==========================================
  const renderOrgStep = () => {
    const slug = formData.agencyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return (
      <div className="space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-900">
            Sua Imobiliária
          </h2>
          <p className="text-slate-500 mt-1">Informações do seu negócio</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Nome da Imobiliária *
            </label>
            <input
              type="text"
              className="w-full p-3.5 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-emerald-500 focus:bg-white transition-colors outline-none font-bold text-slate-700"
              placeholder="Ex: Terra Nobre Imóveis"
              value={formData.agencyName}
              onChange={(e) => update('agencyName', e.target.value)}
            />
            {slug && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <Globe size={12} className="text-emerald-500" />
                <span className="text-slate-400">Sua URL:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {slug}.imobzy.com.br
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                CRECI
              </label>
              <input
                type="text"
                className="w-full p-3.5 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-emerald-500 focus:bg-white transition-colors outline-none text-slate-700"
                placeholder="J-12345"
                value={formData.creci}
                onChange={(e) => update('creci', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Região
              </label>
              <input
                type="text"
                className="w-full p-3.5 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-emerald-500 focus:bg-white transition-colors outline-none text-slate-700"
                placeholder="SP, MG..."
                value={formData.region}
                onChange={(e) => update('region', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Telefone
              </label>
              <input
                type="tel"
                className="w-full p-3.5 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-emerald-500 focus:bg-white transition-colors outline-none text-slate-700"
                placeholder="(00) 0000-0000"
                value={formData.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                WhatsApp
              </label>
              <input
                type="tel"
                className="w-full p-3.5 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-emerald-500 focus:bg-white transition-colors outline-none text-slate-700"
                placeholder="(00) 90000-0000"
                value={formData.whatsapp}
                onChange={(e) => update('whatsapp', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // STEP 5: Confirmation
  // ==========================================
  const renderConfirmStep = () => {
    const selectedPlan = PLANS.find((p) => p.id === formData.plan);
    const selectedProfile = PROFILES.find((p) => p.id === formData.profileType);
    const slug = formData.agencyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Tudo Pronto!</h2>
          <p className="text-slate-500 mt-1">Revise e confirme</p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 size={18} className="text-slate-400" />
              <span className="text-sm text-slate-600">Imobiliária</span>
            </div>
            <span className="font-bold text-slate-800">
              {formData.agencyName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-slate-400" />
              <span className="text-sm text-slate-600">Domínio</span>
            </div>
            <span className="font-mono text-sm font-bold text-emerald-600">
              {slug}.imobzy.com.br
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown size={18} className="text-slate-400" />
              <span className="text-sm text-slate-600">Plano</span>
            </div>
            <span className="font-bold text-slate-800">
              {selectedPlan?.name}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedProfile && (
                <selectedProfile.icon size={18} className="text-slate-400" />
              )}
              <span className="text-sm text-slate-600">Perfil</span>
            </div>
            <span className="font-bold text-slate-800">
              {selectedProfile?.name}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-slate-400" />
              <span className="text-sm text-slate-600">Admin</span>
            </div>
            <span className="font-bold text-slate-800">{formData.email}</span>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-xs text-emerald-700">
            <Shield size={14} className="inline mr-1" />
            Seu site será publicado em <strong>
              {slug}.imobzy.com.br
            </strong>{' '}
            automaticamente via Vercel.
          </p>
        </div>
      </div>
    );
  };

  // ==========================================
  // STEP 6: Success
  // ==========================================
  const renderSuccess = () => (
    <div className="text-center space-y-6 py-4">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
        <Check size={40} className="text-white" />
      </div>

      <div>
        <h2 className="text-2xl font-black text-slate-900">Conta Criada!</h2>
        <p className="text-slate-500 mt-2">
          Sua imobiliária está pronta para operar
        </p>
      </div>

      {success && (
        <div className="bg-slate-50 rounded-2xl p-5 space-y-4 text-left border border-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
              <Lock size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                Seu Painel de Controle
              </p>
              <p className="text-sm text-slate-600 mb-2">
                Acesse com o email <strong>{success.user?.email}</strong>
              </p>
              <a
                href={success.panelUrl}
                className="inline-flex items-center gap-2 font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Acessar Admin Agora <ArrowRight size={14} />
              </a>
            </div>
          </div>

          <div className="h-px bg-slate-200 w-full my-4"></div>

          <div className="flex items-start gap-4 opacity-80">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1">
              <Globe size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                Site Público (Aguardando Propagação)
              </p>
              <div className="font-mono text-sm font-bold text-emerald-700">
                {success.domain?.fullDomain}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                <Loader2 size={10} className="inline mr-1 animate-spin" />
                Estamos configurando o certificado SSL. O site pode levar até{' '}
                <strong>5 minutos</strong> para ficar online.
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => navigate('/login')}
        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-700 text-white p-4 rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-emerald-800 transition-all shadow-lg shadow-emerald-200"
      >
        Acessar Painel →
      </button>
    </div>
  );

  // Superadmin & Admin Bypass UI
  if (profile?.role === 'superadmin' || profile?.role === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
            {profile.role === 'superadmin' ? <Crown size={40} className="text-white -rotate-3" /> : <Shield size={40} className="text-white -rotate-3" />}
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">Olá, {profile.role === 'superadmin' ? 'Administrador!' : 'Gestor!'}</h2>
          <p className="text-slate-500 mb-8 font-medium">
            Você já possui acesso ao painel. Deseja pular o cadastro de imobiliária e ir para o Dashboard?
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => navigate(profile.role === 'superadmin' ? '/superadmin' : '/admin')}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 group"
            >
              Ir para o Painel
              <ArrowRight className="inline ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button
              onClick={() => {
                // Let them stay if they really want to finish onboarding
                setStep(1);
              }}
              className="w-full text-slate-400 py-2 font-bold text-sm hover:text-slate-600 transition-colors"
            >
              Quero cadastrar minha imobiliária agora
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-lg w-full relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black tracking-tighter">
            <span className="text-emerald-700">IMOB</span>
            <span className="text-amber-500">ZY</span>
          </h1>
          <p className="text-slate-400 text-xs uppercase tracking-[0.3em] mt-1">
            Plataforma Imobiliária Inteligente
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/50 overflow-hidden">
          {/* Progress Bar */}
          {step <= totalSteps && (
            <div className="px-8 pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Passo {step} de {totalSteps}
                </span>
                <span className="text-[10px] font-bold text-emerald-600">
                  {Math.round((step / totalSteps) * 100)}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-8">
            {isSystemSetup ? (
              renderAccountStep()
            ) : (
              <>
                {step === 1 && renderPlanStep()}
                {step === 2 && renderProfileStep()}
                {step === 3 && renderAccountStep()}
                {step === 4 && renderOrgStep()}
                {step === 5 && renderConfirmStep()}
              </>
            )}
            {step === 6 && renderSuccess()}

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
                {error}
              </div>
            )}

            {/* Navigation */}
            {step <= totalSteps && (
              <div className="flex gap-3 mt-6">
                {!isSystemSetup && step > 1 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="flex-1 bg-white text-slate-600 border-2 border-slate-200 p-3.5 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={16} /> Voltar
                  </button>
                )}
                {!isSystemSetup && step < totalSteps ? (
                  <button
                    onClick={() => setStep((s) => s + 1)}
                    disabled={!canProceed()}
                    className="flex-[2] bg-gradient-to-r from-slate-800 to-slate-900 text-white p-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:from-slate-900 hover:to-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Próximo <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !canProceed()}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-700 text-white p-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-emerald-800 transition-all shadow-lg shadow-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        {isSystemSetup ? 'Configurando Sistema...' : 'Criando sua conta...'}
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        {isSystemSetup ? 'Finalizar Configuração de Dono' : 'Criar Minha Conta'}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {step <= totalSteps && (
          <p className="text-center text-xs text-slate-400 mt-6">
            Já tem conta?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-emerald-600 font-bold hover:underline"
            >
              Faça login
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
