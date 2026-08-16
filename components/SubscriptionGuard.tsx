import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, LogOut } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import FullScreenSpinner from './FullScreenSpinner';
import { callApi } from '@/src/lib/api';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug?: string | null;
  price_monthly?: number | null;
}

const SubscriptionGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const { profile, loading, signOut } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [saving, setSaving] = useState(false);
  const [requestedPlanId, setRequestedPlanId] = useState<string | null>(null);
  const plansCached = useRef(false);

  useEffect(() => {
    if (plansCached.current) return;
    plansCached.current = true;

    supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true })
      .then(({ data }) => setPlans((data || []) as SubscriptionPlan[]));
  }, []);

  if (loading) return <FullScreenSpinner />;
  if (!profile?.organization || profile.role === 'superadmin')
    return <>{children}</>;

  const org = profile.organization;
  const effectiveRequestedPlanId =
    requestedPlanId ||
    (org.subscription_status === 'payment_required'
      ? org.plan_id || null
      : null);
  const trialEndsAt = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const expiredTrial =
    org.subscription_status === 'trial' &&
    trialEndsAt &&
    trialEndsAt.getTime() < Date.now();
  const missingPlan =
    !org.plan_id &&
    org.subscription_status !== 'active' &&
    org.subscription_status !== 'trial';
  const mustChoosePlan =
    expiredTrial ||
    missingPlan ||
    org.subscription_status === 'payment_required';

  if (!mustChoosePlan) return <>{children}</>;

  const selectPlan = async (planId: string) => {
    setSaving(true);
    try {
      await callApi('/api/subscription/select-plan', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      });

      setRequestedPlanId(planId);
      navigate(`/checkout?planId=${planId}`);
      toast.success(
        'Plano selecionado. Finalize o pagamento para liberar o acesso.'
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível selecionar o plano.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl md:p-8">
        <div className="mb-6 flex items-start gap-4">
          <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
            <AlertCircle size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              {expiredTrial
                ? 'Seu teste gratuito terminou'
                : missingPlan
                  ? 'Escolha um plano para continuar'
                  : 'Acesso suspenso ou pagamento pendente'}
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">
              {expiredTrial
                ? 'Para acessar o painel novamente, escolha um plano. O acesso fica bloqueado até a confirmação do pagamento.'
                : missingPlan
                  ? 'Você precisa selecionar um plano para acessar o sistema. Você não será cobrado durante o período de teste, se aplicável.'
                  : 'Regularize sua assinatura para retomar o acesso ao painel.'}
            </p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            className="ml-auto flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
          >
            <LogOut size={16} />
            Sair da conta
          </button>
        </div>

        {effectiveRequestedPlanId && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            O plano escolhido está aguardando confirmação de pagamento. O acesso
            será liberado somente depois da confirmação.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {plans
            .filter((plan) => (plan.slug || '').toLowerCase() !== 'free')
            .map((plan) => (
              <button
                key={plan.id}
                type="button"
                disabled={saving}
                onClick={() => selectPlan(plan.id)}
                className="rounded-2xl border border-slate-200 p-5 text-left transition hover:border-blue-300 hover:shadow-lg disabled:opacity-60"
              >
                <p className="text-lg font-bold text-slate-950">{plan.name}</p>
                <p className="mt-1 text-3xl font-bold text-blue-600">
                  R$ {Number(plan.price_monthly || 0).toLocaleString('pt-BR')}
                  <span className="text-xs font-bold text-slate-400">/mês</span>
                </p>
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  {effectiveRequestedPlanId === plan.id
                    ? 'Aguardando confirmação'
                    : 'Selecionar plano'}
                </p>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionGuard;
