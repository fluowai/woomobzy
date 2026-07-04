import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { callApi } from '../src/lib/api';
import {
  Building2,
  Tractor,
  Home,
  CheckCircle2,
  ArrowRight,
  Bot,
  MessageSquare,
  Users,
  Loader2,
  Mail,
  Lock,
  User,
  Zap,
  Globe
} from 'lucide-react';
import { getTenantBaseUrl } from '../utils/platform';


const SITE_TEMPLATES = {
  rural: [
    { id: 'r1', name: 'Fazenda Premium', color: 'emerald', image: '/templates/template_lifestyle.png' },
    { id: 'r2', name: 'Agro Business', color: 'green', image: '/templates/template_production.png' },
    { id: 'r3', name: 'Haras & Sítios', color: 'amber', image: '/templates/template_tractor_soil.png' },
  ],
  urban: [
    { id: 'u1', name: 'Urbano Minimal', color: 'slate', image: '/templates/urban/urban_apartment_center.png' },
    { id: 'u2', name: 'City Connect', color: 'blue', image: '/templates/urban/urban_exclusive_launch.png' },
    { id: 'u3', name: 'Família & Lar', color: 'indigo', image: '/templates/urban/urban_gated_community.png' },
  ]
};

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);

  const [formData, setFormData] = useState({
    // Step 1: Account & Profile
    name: '',
    email: '',
    password: '',
    agencyName: '',
    cnpj: '',
    niche: 'urban' as 'rural' | 'urban',
    template: '',
    
    // Step 2: AI
    llmProvider: 'openai',
    apiKey: '',
    
    // Step 3: WhatsApp
    welcomeMessage: 'Olá! Sou o assistente virtual. Como posso ajudar?',
    
    // Step 4: Team
    teamEmails: ['', '', '']
  });

  const update = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const updateTeamEmail = (index: number, value: string) => {
    const newEmails = [...formData.teamEmails];
    newEmails[index] = value;
    update('teamEmails', newEmails);
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password || !formData.agencyName || !formData.template) {
        setError('Preencha todos os campos obrigatórios e escolha um template.');
        return;
      }
      if (formData.password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
    }

    if (step === 4) {
      // Final Submit
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
            plan: 'pro' // Defaulting to pro as requested in previous flow to avoid free plan limitations
          }),
        });
        setSuccess(data);
        setStep(5);
      } catch (err: any) {
        setError(err.message || 'Erro ao criar conta. Tente novamente.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setStep(s => s + 1);
  };

  // =====================================
  // UI STEPS
  // =====================================

  const renderStep1 = () => (
    <div className="animate-fade-in-slide space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">O Perfil da sua Imobiliária</h2>
        <p className="text-slate-500 mt-2">Vamos preparar a sua fundação digital.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Seu Nome *</label>
          <div className="relative">
            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={formData.name} onChange={e => update('name', e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-colors" placeholder="Nome completo" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Email Profissional *</label>
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="email" value={formData.email} onChange={e => update('email', e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-colors" placeholder="seu@email.com.br" />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome da Imobiliária *</label>
          <div className="relative">
            <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={formData.agencyName} onChange={e => update('agencyName', e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-colors" placeholder="Ex: Nobre Imóveis" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Senha Segura *</label>
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="password" value={formData.password} onChange={e => update('password', e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-colors" placeholder="Mínimo 6 caracteres" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Qual é o seu foco principal?</label>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => update('niche', 'urban')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.niche === 'urban' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
            <Home size={24} className={formData.niche === 'urban' ? 'text-blue-600' : 'text-slate-400'} />
            <span className={`font-bold ${formData.niche === 'urban' ? 'text-blue-900' : 'text-slate-600'}`}>Urbano</span>
          </button>
          <button onClick={() => update('niche', 'rural')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.niche === 'rural' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
            <Tractor size={24} className={formData.niche === 'rural' ? 'text-emerald-600' : 'text-slate-400'} />
            <span className={`font-bold ${formData.niche === 'rural' ? 'text-emerald-900' : 'text-slate-600'}`}>Rural</span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Escolha o Tema do seu Site *</label>
        <div className="grid grid-cols-3 gap-3">
          {SITE_TEMPLATES[formData.niche].map(t => (
            <button key={t.id} onClick={() => update('template', t.id)} className={`p-3 rounded-xl border-2 text-left transition-all ${formData.template === t.id ? (formData.niche === 'urban' ? 'border-blue-500 bg-blue-50' : 'border-emerald-500 bg-emerald-50') : 'border-slate-100 bg-white hover:border-slate-200'}`}>
              {t.image ? (
                <div className={`w-full h-24 rounded-lg mb-2 border overflow-hidden ${formData.template === t.id ? `border-${t.color}-500 ring-2 ring-${t.color}-500/20` : `border-slate-200`}`}>
                  <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`w-full h-24 rounded-lg bg-${t.color}-100 mb-2 border border-${t.color}-200`} />
              )}
              <p className="text-xs font-bold text-slate-700 text-center">{t.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="animate-fade-in-slide space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Bot size={32} className="text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Inteligência Artificial</h2>
        <p className="text-slate-500 mt-2">Conecte o "cérebro" que vai atender seus clientes 24h por dia.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {['openai', 'gemini'].map(llm => (
          <button key={llm} onClick={() => update('llmProvider', llm)} className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${formData.llmProvider === llm ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
            <span className="font-bold text-slate-700 uppercase">{llm}</span>
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Sua API Key (Opcional por agora)</label>
        <input type="password" value={formData.apiKey} onChange={e => update('apiKey', e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-colors font-mono text-sm" placeholder="sk-..." />
        <p className="text-xs text-slate-400 mt-2">Você pode pular e configurar isso mais tarde no painel.</p>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="animate-fade-in-slide space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageSquare size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Conexão WhatsApp</h2>
        <p className="text-slate-500 mt-2">Onde a mágica do atendimento acontece.</p>
      </div>

      <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
         <div className="w-48 h-48 bg-white border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center">
            <p className="text-slate-400 font-medium text-sm px-4">O QR Code aparecerá no seu painel administrativo.</p>
         </div>
         <p className="text-sm text-slate-600">Conectaremos o WhatsApp diretamente por lá para maior segurança.</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Mensagem de Saudação da IA</label>
        <textarea value={formData.welcomeMessage} onChange={e => update('welcomeMessage', e.target.value)} className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-colors resize-none h-24" />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="animate-fade-in-slide space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users size={32} className="text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Convide sua Equipe</h2>
        <p className="text-slate-500 mt-2">Convide corretores ou sócios para colaborar com você. (Opcional)</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {formData.teamEmails.map((email, idx) => (
          <div key={idx}>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Corretor {idx + 1}</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" value={email} onChange={e => updateTeamEmail(idx, e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-colors" placeholder="email@exemplo.com" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep5 = () => {
    const slug = formData.agencyName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    return (
      <div className="animate-fade-in-scale text-center space-y-6 py-8">
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-200">
          <CheckCircle2 size={48} className="text-white" />
        </div>
        
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Tudo Pronto!</h2>
          <p className="text-slate-500 mt-2 text-lg">Sua infraestrutura de vendas foi gerada.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left space-y-4 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-amber-500" />
            <span className="font-bold text-slate-700">IA Configurada e Pronta</span>
          </div>
          <div className="flex items-center gap-3">
            <Globe size={20} className="text-blue-500" />
            <div>
              <span className="font-bold text-slate-700 block">Seu Site Oficial</span>
              <span className="text-xs text-slate-500 font-mono">{getTenantBaseUrl(slug)}</span>
            </div>
          </div>
        </div>

        <button onClick={() => navigate('/login')} className="w-full max-w-md mx-auto bg-slate-900 text-white p-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20">
          Acessar Meu Painel →
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-blue-100">
      <div className="w-full max-w-2xl">
        
        {/* Header Progress */}
        {step < 5 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Passo {step} de 4</span>
              <span className="text-xs font-bold text-blue-600">
                {step === 1 && 'Fundação'}
                {step === 2 && 'Inteligência'}
                {step === 3 && 'Canais'}
                {step === 4 && 'Equipe'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Content Box */}
        <div className={`bg-white rounded-[2rem] shadow-2xl shadow-slate-900/5 p-8 md:p-10 border border-slate-100 ${step === 5 ? 'border-emerald-100 bg-gradient-to-b from-emerald-50/50 to-white' : ''}`}>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-600" />
              {error}
            </div>
          )}

          <AnimatePresence>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
          </AnimatePresence>

          {/* Footer Controls */}
          {step < 5 && (
            <div className="mt-10 flex items-center justify-between pt-6 border-t border-slate-100">
              <button onClick={() => setStep(s => Math.max(1, s - 1))} className={`px-6 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}>
                Voltar
              </button>
              
              <button onClick={handleNext} disabled={loading} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70 shadow-lg shadow-blue-600/20">
                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                  <>
                    {step === 4 ? 'Concluir Setup' : 'Avançar'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Onboarding;
