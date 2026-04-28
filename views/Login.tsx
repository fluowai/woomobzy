import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Lock, Mail, AlertCircle, ArrowRight, Building2, BarChart3, Shield, Sparkles } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const { settings } = useSettings();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [justSignedIn, setJustSignedIn] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  // A2: If already authenticated, redirect away from login
  useEffect(() => {
    if (authLoading || !justSignedIn) return;
    if (!user || !profile) return;

    console.log('✅ [Login] Profile loaded via AuthContext, redirecting...', {
      role: profile.role,
      org: profile.organization?.niche,
    });

    if (profile.role === 'superadmin') {
      navigate('/superadmin', { replace: true });
    } else if (profile.role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (!profile.organization_id) {
      navigate('/onboarding', { replace: true });
    } else {
      navigate('/admin', { replace: true });
    }
  }, [user, profile, authLoading, justSignedIn, navigate]);

  // A2: If user navigates to /login while already authenticated
  if (!authLoading && user && profile && !justSignedIn) {
    console.log('🔄 [Login] Already authenticated, redirecting away from login page.');
    if (profile.role === 'superadmin') {
      return <Navigate to="/superadmin" replace />;
    }
    if (!profile.organization_id && (profile.role === 'user' || !profile.role)) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🚀 [Login] Starting signIn for:', email);
      await signIn(email, password);
      setJustSignedIn(true);
      console.log('✅ [Login] signIn successful. Waiting for AuthContext to load profile...');
      
      setTimeout(() => {
        if (loading) {
          console.warn('⚠️ [Login] Profile loading timed out.');
          setLoading(false);
          setJustSignedIn(false);
          setError('O carregamento do perfil está demorando mais que o esperado. Tente novamente.');
        }
      }, 8000);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
      setLoading(false);
    }
  };

  const features = [
    { icon: Building2, title: 'Gestão Inteligente', desc: 'Controle total do seu portfólio Agro e Urbano' },
    { icon: Sparkles, title: 'IA Generativa', desc: 'Automação de leads e respostas com LLMs' },
    { icon: BarChart3, title: 'Mercado em Tempo Real', desc: 'Cotações CEPEA e análises ambientais' },
    { icon: Shield, title: 'Segurança Bancária', desc: 'Dados protegidos com criptografia militar' },
  ];

  return (
    <div className="login-page-wrapper" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `url("/premium_agro_real_estate_background_1777391740960.png") center/cover no-repeat`,
      fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
      padding: '20px',
    }}>
      {/* Dark Overlay for better contrast */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to right, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.4) 50%, rgba(15, 23, 42, 0.8) 100%)',
        zIndex: 1,
      }} />

      <div style={{
        width: '100%',
        maxWidth: '1200px',
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '60px',
        position: 'relative',
        zIndex: 2,
        alignItems: 'center',
      }}>
        
        {/* LEFT SIDE - CONTENT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }} className="hidden lg:flex">
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '100px',
              marginBottom: '24px',
              animation: 'fadeInDown 0.8s ease-out',
            }}>
              <Sparkles size={16} className="text-emerald-400" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', tracking: '0.1em' }}>
                O Futuro do Real Estate
              </span>
            </div>
            
            <h1 style={{
              fontSize: '4.5rem',
              fontWeight: 900,
              color: 'white',
              lineHeight: 0.9,
              letterSpacing: '-0.04em',
              marginBottom: '24px',
              animation: 'slideInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              IMOBZY <span style={{ color: '#10b981' }}>360</span>
            </h1>
            
            <p style={{
              fontSize: '1.25rem',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.6,
              maxWidth: '500px',
              animation: 'slideInLeft 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              A plataforma definitiva para transformar sua imobiliária em uma máquina 
              de vendas movida a dados e inteligência artificial.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            animation: 'fadeInUp 1s ease-out',
          }}>
            {features.map((f, i) => (
              <div key={i} style={{
                padding: '24px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '24px',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  color: '#10b981',
                }}>
                  <f.icon size={20} />
                </div>
                <h4 style={{ color: 'white', fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px' }}>{f.title}</h4>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', lineHeight: 1.4 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE - FORM */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: '100%',
            maxWidth: '460px',
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '40px',
            padding: '60px 48px',
            boxShadow: '0 40px 100px -20px rgba(0,0,0,0.5)',
            animation: 'scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <img 
                src={settings.logoUrl || '/logo-imobzy.png'} 
                alt="Logo" 
                style={{ height: '50px', marginBottom: '24px', filter: 'brightness(0) invert(1)' }}
              />
              <h2 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Bem-vindo de volta</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '8px' }}>Acesse sua conta para gerenciar sua operação.</p>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '16px',
                borderRadius: '16px',
                color: '#fca5a5',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px',
              }}>
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>E-mail</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: focusedField === 'email' ? '#10b981' : 'rgba(255,255,255,0.3)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="seu@email.com"
                    style={{
                      width: '100%',
                      padding: '18px 20px 18px 54px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '18px',
                      color: 'white',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      borderColor: focusedField === 'email' ? '#10b981' : 'rgba(255,255,255,0.1)',
                      boxShadow: focusedField === 'email' ? '0 0 20px rgba(16, 185, 129, 0.1)' : 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Senha</label>
                  <Link to="/forgot-password" style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}>Esqueceu?</Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: focusedField === 'password' ? '#10b981' : 'rgba(255,255,255,0.3)' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '18px 20px 18px 54px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '18px',
                      color: 'white',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      borderColor: focusedField === 'password' ? '#10b981' : 'rgba(255,255,255,0.1)',
                      boxShadow: focusedField === 'password' ? '0 0 20px rgba(16, 185, 129, 0.1)' : 'none',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || justSignedIn}
                style={{
                  width: '100%',
                  padding: '20px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '18px',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '1rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  marginTop: '12px',
                  boxShadow: '0 20px 40px -10px rgba(16, 185, 129, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 30px 60px -12px rgba(16, 185, 129, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" /> : 'Entrar no Sistema'}
                {!loading && <ArrowRight size={20} />}
              </button>
            </form>

            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                Não tem uma conta? <Link to="/register" style={{ color: 'white', fontWeight: 700, textDecoration: 'none' }}>Começar Agora</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-60px); filter: blur(10px); }
          to { opacity: 1; transform: translateX(0); filter: blur(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Login;
