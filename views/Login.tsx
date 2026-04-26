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
    { icon: Building2, title: 'Gestão de Imóveis', desc: 'Controle total do seu portfólio Rural e Urbano' },
    { icon: BarChart3, title: 'Relatórios Inteligentes', desc: 'Dashboards com análises em tempo real' },
    { icon: Shield, title: 'Segurança Total', desc: 'Dados protegidos com criptografia avançada' },
    { icon: Sparkles, title: 'IA Integrada', desc: 'Inteligência artificial para decisões assertivas' },
  ];

  return (
    <div className="login-page-wrapper" style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 25%, #f0fdfa 50%, #f5f3ff 75%, #fdf4ff 100%)',
      fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated Background Orbs */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
        animation: 'float 8s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', left: '-5%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, transparent 70%)',
        animation: 'float 10s ease-in-out infinite reverse',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '40%', left: '30%',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.04) 0%, transparent 70%)',
        animation: 'float 12s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* ═══════════ LEFT PANEL — BRANDING ═══════════ */}
      <div style={{
        flex: '1 1 55%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 80px',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '48px', animation: 'slideInLeft 0.7s ease-out' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '16px', textDecoration: 'none' }}>
            <img
              src={settings.logoUrl || '/logo-imobzy.png'}
              alt={settings.agencyName || 'IMOBZY'}
              style={{
                height: '56px',
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))',
              }}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.dataset.hasError) return;
                target.dataset.hasError = 'true';
                target.style.display = 'none';
              }}
            />
          </Link>
        </div>

        {/* Hero Text */}
        <div style={{ animation: 'slideInLeft 0.8s ease-out', animationDelay: '0.1s', animationFillMode: 'both' }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 3.5vw, 3.2rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            color: '#0f172a',
            marginBottom: '20px',
            letterSpacing: '-0.03em',
          }}>
            Gerencie sua<br />
            imobiliária com<br />
            <span style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #0d9488 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              inteligência.
            </span>
          </h1>
          <p style={{
            fontSize: '1.125rem',
            color: '#64748b',
            maxWidth: '480px',
            lineHeight: 1.7,
            fontWeight: 400,
          }}>
            A plataforma completa para corretores e imobiliárias que querem 
            crescer com tecnologia, organização e resultados reais.
          </p>
        </div>

        {/* Feature Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px',
          marginTop: '48px',
          maxWidth: '560px',
          animation: 'slideInLeft 0.9s ease-out',
          animationDelay: '0.3s',
          animationFillMode: 'both',
        }}>
          {features.map((feature, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '20px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(226, 232, 240, 0.6)',
                transition: 'all 0.3s ease',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 32px -8px rgba(16, 185, 129, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.6)';
              }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <feature.icon size={20} style={{ color: '#059669' }} />
              </div>
              <div>
                <h3 style={{
                  fontSize: '0.875rem', fontWeight: 700, color: '#1e293b',
                  marginBottom: '4px', lineHeight: 1.3,
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5,
                  margin: 0,
                }}>
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Indicators */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '24px',
          marginTop: '40px',
          animation: 'slideInLeft 1s ease-out',
          animationDelay: '0.5s',
          animationFillMode: 'both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#10b981', boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)',
            }} />
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
              Sistema Online 24/7
            </span>
          </div>
          <div style={{
            width: '1px', height: '16px', background: '#e2e8f0',
          }} />
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
            🔒 Dados criptografados
          </span>
          <div style={{
            width: '1px', height: '16px', background: '#e2e8f0',
          }} />
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
            🇧🇷 100% Brasileiro
          </span>
        </div>
      </div>

      {/* ═══════════ RIGHT PANEL — LOGIN FORM ═══════════ */}
      <div style={{
        flex: '1 1 45%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        position: 'relative',
        zIndex: 2,
      }}>
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '28px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 32px 64px -16px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(255,255,255,0.6) inset',
            padding: '48px 40px',
            animation: 'slideInRight 0.7s ease-out',
          }}
        >
          {/* Card Header */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '20px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 24px -4px rgba(16, 185, 129, 0.3)',
            }}>
              <Lock size={28} style={{ color: 'white' }} />
            </div>
            <h2 style={{
              fontSize: '1.5rem', fontWeight: 700, color: '#0f172a',
              marginBottom: '8px', letterSpacing: '-0.02em',
            }}>
              Acesse sua conta
            </h2>
            <p style={{
              fontSize: '0.9rem', color: '#94a3b8', margin: 0,
            }}>
              Entre com suas credenciais para continuar
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              marginBottom: '24px', padding: '14px 16px',
              background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
              border: '1px solid #fecaca',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', gap: '12px',
              animation: 'slideUp 0.3s ease-out',
            }}>
              <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
              <p style={{ fontSize: '0.85rem', color: '#dc2626', margin: 0, fontWeight: 500 }}>
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Email Field */}
            <div>
              <label style={{
                display: 'block', fontSize: '0.8rem', fontWeight: 600,
                color: '#475569', marginBottom: '8px', letterSpacing: '0.02em',
              }}>
                E-mail de acesso
              </label>
              <div style={{
                position: 'relative',
                borderRadius: '14px',
                border: `2px solid ${focusedField === 'email' ? '#10b981' : '#e2e8f0'}`,
                background: focusedField === 'email' ? '#ffffff' : '#f8fafc',
                transition: 'all 0.25s ease',
                boxShadow: focusedField === 'email' ? '0 0 0 4px rgba(16, 185, 129, 0.1)' : 'none',
              }}>
                <Mail
                  size={18}
                  style={{
                    position: 'absolute', left: '16px', top: '50%',
                    transform: 'translateY(-50%)',
                    color: focusedField === 'email' ? '#10b981' : '#94a3b8',
                    transition: 'color 0.25s ease',
                  }}
                />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="seu@email.com"
                  style={{
                    width: '100%', padding: '14px 16px 14px 48px',
                    fontSize: '0.95rem', color: '#1e293b',
                    background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '8px',
              }}>
                <label style={{
                  fontSize: '0.8rem', fontWeight: 600, color: '#475569',
                  letterSpacing: '0.02em',
                }}>
                  Senha
                </label>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: '0.8rem', fontWeight: 600,
                    color: '#10b981', textDecoration: 'none',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#10b981'}
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div style={{
                position: 'relative',
                borderRadius: '14px',
                border: `2px solid ${focusedField === 'password' ? '#10b981' : '#e2e8f0'}`,
                background: focusedField === 'password' ? '#ffffff' : '#f8fafc',
                transition: 'all 0.25s ease',
                boxShadow: focusedField === 'password' ? '0 0 0 4px rgba(16, 185, 129, 0.1)' : 'none',
              }}>
                <Lock
                  size={18}
                  style={{
                    position: 'absolute', left: '16px', top: '50%',
                    transform: 'translateY(-50%)',
                    color: focusedField === 'password' ? '#10b981' : '#94a3b8',
                    transition: 'color 0.25s ease',
                  }}
                />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '14px 16px 14px 48px',
                    fontSize: '0.95rem', color: '#1e293b',
                    background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading || justSignedIn}
              style={{
                width: '100%', padding: '16px',
                fontSize: '0.95rem', fontWeight: 700,
                color: 'white', border: 'none', cursor: 'pointer',
                borderRadius: '14px',
                background: loading || justSignedIn
                  ? 'linear-gradient(135deg, #86efac 0%, #6ee7b7 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: loading || justSignedIn
                  ? 'none'
                  : '0 8px 24px -4px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.3s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '0.02em',
                transform: 'translateY(0)',
              }}
              onMouseEnter={(e) => {
                if (!loading && !justSignedIn) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px -4px rgba(16, 185, 129, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = loading ? 'none' : '0 8px 24px -4px rgba(16, 185, 129, 0.35)';
              }}
            >
              {loading || justSignedIn ? (
                <>
                  <div style={{
                    width: '20px', height: '20px',
                    border: '2.5px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar no Painel
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            margin: '28px 0',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #e2e8f0, transparent)' }} />
          </div>

          {/* Register CTA */}
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: '0.9rem', color: '#64748b', margin: 0,
            }}>
              Ainda não tem uma conta?{' '}
              <Link
                to="/register"
                style={{
                  fontWeight: 700, color: '#10b981',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                  borderBottom: '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#059669';
                  e.currentTarget.style.borderBottomColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#10b981';
                  e.currentTarget.style.borderBottomColor = 'transparent';
                }}
              >
                Cadastre-se grátis
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Inline Keyframe Animations */}
      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        /* Responsive adjustments */
        @media (max-width: 900px) {
          .login-page-wrapper > div:first-child {
            display: none !important;
          }
          .login-page-wrapper > div:last-child {
            flex: 1 1 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
