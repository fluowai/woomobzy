import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { settings } = useSettings();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);


    try {
      console.log('🚀 [Login] Starting signIn for:', email);
      await signIn(email, password);
      
      console.log('✅ [Login] signIn successful, fetching user...');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('👤 [Login] User found:', user.id);
        
        // Retry logic for profile fetch (Supabase sync might take a millisecond)
        let profile = null;
        for (let i = 0; i < 3; i++) {
          const { data, error } = await supabase
            .from('profiles')
            .select('role, organization:organizations(niche)')
            .eq('id', user.id)
            .single();
            
          if (data) {
            profile = data;
            break;
          }
          console.warn(`⚠️ [Login] Profile fetch attempt ${i+1} failed, retrying...`, error);
          await new Promise(r => setTimeout(r, 500));
        }

        console.log('📋 [Login] Profile result:', profile);

        if (profile?.role === 'superadmin') {
          console.log('👑 [Login] Role detected is SUPERADMIN. Using navigate to /superadmin');
          navigate('/superadmin', { replace: true });
        } else {
          console.log('🏢 [Login] Role detected is NOT superadmin. Using standard redirect.');
          navigate('/admin');
        }
        return;
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-black uppercase italic tracking-tighter mb-2">
            {settings.agencyName || 'ImobiSaaS'}
          </h1>
          <p className="text-black/60 font-medium">Acesso Administrativo</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[2rem] shadow-2xl p-8 border border-slate-100">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-black rounded-2xl">
              <Lock size={32} className="text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-black text-center mb-8">Login</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 mt-0.5" />
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase text-black/40 tracking-[0.2em] mb-2 ml-4">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-black/10 outline-none font-bold text-sm transition-all"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-black/40 tracking-[0.2em] mb-2 ml-4">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-black/10 outline-none font-bold text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: settings.primaryColor }}
              className="w-full py-4 text-white rounded-2xl font-black uppercase text-sm tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-black/60">
              Não tem uma conta?{' '}
              <Link to="/register" className="font-black text-black hover:underline">
                Criar conta
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Site */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-black/40 hover:text-black font-bold transition">
            ← Voltar para o site
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
