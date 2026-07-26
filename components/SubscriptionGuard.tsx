import React, { useRef, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import FullScreenSpinner from './FullScreenSpinner';

const SubscriptionGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { profile, loading } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const plansCached = useRef(false);

  useEffect(() => {
    if (plansCached.current) return;
    plansCached.current = true;

    supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true })
      .then(({ data }) => setPlans(data || []));
  }, []);

  if (loading) return <FullScreenSpinner />;
  if (!profile?.organization || profile.role === 'superadmin')
    return <>{children}</>;

  const org: any = profile.organization;
  const trialEndsAt = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const expiredTrial =
    org.subscription_status === 'trial' &&
    trialEndsAt &&
    trialEndsAt.getTime() < Date.now();
  const missingPlan = !org.plan_id && org.subscription_status !== 'active';
  const mustChoosePlan =
    expiredTrial ||
    missingPlan ||
    org.subscription_status === 'payment_required';

  if (!mustChoosePlan) return <>{children}</>;

  const selectPlan = async (planId: string) => {
    setSaving(true);
    await supabase
      .from('organizations')
      .update({
        plan_id: planId,
        subscription_status: 'active',
        selected_plan_at: new Date().toISOString(),
      })
      .eq('id', org.id);
    window.location.reload();
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
              Seu teste gratuito terminou
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">
              Para acessar o painel novamente, escolha um plano. O acesso fica
              bloqueado ate a selecao do plano.
            </p>
          </div>
        </div>

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
                  <span className="text-xs font-bold text-slate-400">/mes</span>
                </p>
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  Selecionar plano e continuar
                </p>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionGuard;
