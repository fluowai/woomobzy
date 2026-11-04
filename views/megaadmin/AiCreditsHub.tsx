import React, { useEffect, useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import { Bot, Coins, Plus, Settings2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  is_reseller: boolean;
  parent_id: string | null;
  ai_balances?: { balance_tokens: number }[];
}

interface Plan {
  id: string;
  name: string;
  ai_credits_limit: number;
}

export default function AiCreditsHub() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferAmount, setTransferAmount] = useState<number>(100000);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orgsRes, plansRes] = await Promise.all([
        supabase
          .from('organizations')
          .select('id, name, is_reseller, parent_id, ai_balances(balance_tokens)')
          .order('name'),
        supabase
          .from('plans')
          .select('id, name, ai_credits_limit')
          .order('name')
      ]);

      if (orgsRes.data) setOrganizations(orgsRes.data);
      if (plansRes.data) setPlans(plansRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados do Hub de Créditos.');
    } finally {
      setLoading(false);
    }
  };

  const handleInjectCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || transferAmount <= 0) return;
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          targetOrgId: selectedOrg,
          amount: transferAmount,
          type: 'recharge' // Somente MegaAdmin usa recharge
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      toast.success(data.message);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePlanCredit = async (planId: string, newLimit: number) => {
    try {
      const { error } = await supabase
        .from('plans')
        .update({ ai_credits_limit: newLimit })
        .eq('id', planId);
      
      if (error) throw error;
      toast.success('Limite do plano atualizado!');
      fetchData();
    } catch (err) {
      toast.error('Erro ao atualizar plano.');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Bot className="text-indigo-600" /> AI Credits Hub (Gateway)
        </h1>
        <p className="text-slate-500">Gestão de carteiras, injeção de tokens virtuais e limites por plano.</p>
      </header>

      {/* Seção 1: Injeção Livre (Mega Admin) */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Coins className="text-emerald-500" /> Injetar Créditos (Mint)
        </h2>
        <form onSubmit={handleInjectCredits} className="flex flex-col md:flex-row gap-4 md:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Organização Destino</label>
            <select
              required
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {organizations.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name} {o.is_reseller ? '(REVENDA)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 md:flex-none md:w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade (Tokens)</label>
            <input
              type="number"
              min="1"
              required
              value={transferAmount}
              onChange={(e) => setTransferAmount(Number(e.target.value))}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={processing}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Injetar Tokens
          </button>
        </form>
      </section>

      {/* Seção 2: Tabela de Planos (Requisito do cliente) */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Settings2 className="text-blue-500" /> Alocação de Tokens por Plano (Mensal)
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Defina a quantia de tokens (créditos de IA) embutida em cada plano. Quando o cliente assinar ou renovar, receberá este valor no saldo.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">Nome do Plano</th>
                <th className="py-3 px-4 font-semibold">Cota Mensal de IA (Tokens)</th>
                <th className="py-3 px-4 font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-800">{p.name}</td>
                  <td className="py-3 px-4">
                    <input 
                      type="number"
                      defaultValue={p.ai_credits_limit}
                      onBlur={(e) => handleUpdatePlanCredit(p.id, Number(e.target.value))}
                      className="w-32 rounded border-slate-300 py-1 px-2 text-sm"
                    />
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500">
                    Salva automaticamente ao sair
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-slate-500">Nenhum plano cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Seção 3: Auditoria de Saldos Globais */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <ShieldAlert className="text-orange-500" /> Auditoria de Saldos Globais
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">Organização</th>
                <th className="py-3 px-4 font-semibold">Tipo</th>
                <th className="py-3 px-4 font-semibold text-right">Saldo Atual (Tokens)</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => {
                const balance = org.ai_balances?.[0]?.balance_tokens || 0;
                return (
                  <tr key={org.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">{org.name}</td>
                    <td className="py-3 px-4">
                      {org.is_reseller ? (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                          Revenda
                        </span>
                      ) : org.parent_id ? (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                          Cliente (Revenda)
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                          Cliente (Direto)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-indigo-600">
                      {balance.toLocaleString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
