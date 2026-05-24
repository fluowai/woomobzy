import React, { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Building2, Map, Loader2 } from 'lucide-react';
import { useEnvironment, EnvironmentType } from '../context/EnvironmentContext';

const copy = {
  urban: {
    title: 'Ativar Imobzy Urbana',
    description:
      'Sua conta ainda nao possui um ambiente urbano. Ao ativar, criaremos um painel separado para casas, apartamentos, aluguel, lancamentos, loteamentos e funis urbanos.',
    button: 'Ativar ambiente urbano',
    path: '/urban',
    icon: Building2,
  },
  rural: {
    title: 'Ativar Imobzy Rural',
    description:
      'Sua conta ainda nao possui um ambiente rural. Ao ativar, criaremos um painel separado para fazendas, sitios, chacaras, areas, CAR, SIGEF, mapas, documentos rurais e funis rurais.',
    button: 'Ativar ambiente rural',
    path: '/rural',
    icon: Map,
  },
};

const isEnvironmentType = (type?: string): type is EnvironmentType => type === 'urban' || type === 'rural';

const ActivateEnvironment: React.FC = () => {
  const { type } = useParams();
  const navigate = useNavigate();
  const { createEnvironment, getEnvironmentByType, switchEnvironment } = useEnvironment();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isEnvironmentType(type)) {
    return <Navigate to="/admin" replace />;
  }

  const existing = getEnvironmentByType(type);
  if (existing) {
    return <Navigate to={copy[type].path} replace />;
  }

  const content = copy[type];
  const Icon = content.icon;

  const activate = async () => {
    setSaving(true);
    setError(null);
    try {
      await createEnvironment(type, type === 'rural' ? 'Imobzy Rural' : 'Imobzy Urbana');
      await switchEnvironment(type);
      navigate(content.path, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel ativar o ambiente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <div className="w-full rounded-2xl border border-white/10 bg-white p-8 text-slate-950 shadow-2xl">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Icon size={28} />
          </div>
          <h1 className="text-3xl font-black tracking-tight">{content.title}</h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
            {content.description}
          </p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={activate}
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {saving && <Loader2 size={18} className="animate-spin" />}
              {content.button}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivateEnvironment;
