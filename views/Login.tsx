import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { 
  Lock, 
  Mail, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  LayoutDashboard,
  ArrowRight
} from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { signIn, user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      setIsSuccess(true);
      // O redirecionamento acontece via AuthContext/App.tsx
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <LayoutDashboard className="w-5 h-5 text-emerald-600" />,
      title: "Gestão 360º",
      desc: "Controle total de imóveis rurais e urbanos em um só lugar."
    },
    {
      icon: <Zap className="w-5 h-5 text-emerald-600" />,
      title: "IA Integrada",
      desc: "Automação inteligente de leads e respostas via WhatsApp."
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      title: "Segurança Total",
      desc: "Dados protegidos com criptografia de ponta a ponta."
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      title: "Multi-inquilino",
      desc: "Configure suas próprias APIs do Google e Groq por empresa."
    }
  ];

  return (
    <div className="login-page-wrapper" style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 25%, #f0fdfa 50%, #f5f3ff 75%, #fdf4ff 100%)',
      fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Orbs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-5%',
        width: '40vw',
        height: '40vw',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0) 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-5%',
        width: '35vw',
        height: '35vw',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, rgba(99, 102, 241, 0) 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        zIndex: 0
      }} />

      {/* Main Content Split Layout */}
      <div className="flex w-full z-10">
        
        {/* Left Side: Branding & Features (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-20 relative">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                <img src="/logo-imobzy.png" alt="IMOBZY" className="w-8 h-8 object-contain brightness-0 invert" />
              </div>
              <span className="text-3xl font-bold tracking-tight text-slate-900">
                IMOB<span className="text-emerald-600">ZY</span>
              </span>
            </div>

            <h1 className="text-5xl font-extrabold text-slate-900 leading-tight mb-6">
              Gerencie sua imobiliária com <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">inteligência</span>
            </h1>
            
            <p className="text-lg text-slate-600 mb-12 leading-relaxed">
              A plataforma definitiva para corretores e gestores que buscam escala, automação e alta performance no mercado imobiliário.
            </p>

            <div className="grid grid-cols-2 gap-8 mb-12">
              {features.map((f, i) => (
                <div key={i} className="group p-4 rounded-2xl border border-white/50 bg-white/30 backdrop-blur-sm hover:bg-white/60 transition-all duration-300">
                  <div className="mb-3 p-2 w-fit rounded-lg bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-slate-500">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
                    <img src={`https://i.pravatar.cc/100?u=${i + 10}`} alt="User" />
                  </div>
                ))}
              </div>
              <span>+2.000 profissionais já utilizam</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo Only */}
            <div className="lg:hidden flex flex-col items-center mb-10">
              <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-200 mb-4">
                <img src="/logo-imobzy.png" alt="IMOBZY" className="w-10 h-10 object-contain brightness-0 invert" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">IMOBZY</h2>
            </div>

            <div className="bg-white/70 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-emerald-900/5 border border-white relative overflow-hidden">
              {/* Success Overlay */}
              {isSuccess && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Bem-vindo de volta!</h3>
                  <p className="text-slate-500">Autenticação realizada com sucesso. Redirecionando...</p>
                  <Loader2 className="mt-6 animate-spin text-emerald-600" size={24} />
                </div>
              )}

              <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Login</h2>
                <p className="text-slate-500">Entre com suas credenciais para acessar o painel administrativo.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 ml-1">E-mail corporativo</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                      <Mail size={20} />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-11 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                      placeholder="seu@email.com.br"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-sm font-semibold text-slate-700">Senha</label>
                    <Link to="/forgot-password" size="sm" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                      <Lock size={20} />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl animate-shake">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <>
                      Acessar Sistema
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col items-center gap-4">
                <p className="text-sm text-slate-500">
                  Ainda não tem uma conta?
                </p>
                <Link 
                  to="/register" 
                  className="inline-flex items-center justify-center px-6 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Criar conta gratuita
                </Link>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-slate-400">
                &copy; {new Date().getFullYear()} IMOBZY Technology. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
        .login-page-wrapper {
          transition: background 0.5s ease;
        }
      `}} />
    </div>
  );
};

export default Login;
