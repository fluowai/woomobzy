import React, { useState, useEffect, useCallback } from 'react';
import {
  Key,
  FileText,
  DollarSign,
  Clock,
  Home,
  User,
  LogOut,
  Download,
  CheckCircle,
  AlertTriangle,
  Calendar,
  CreditCard,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface Contract {
  id: string;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  adjustment_index: string;
  payment_status: string;
  status: string;
  property?: {
    title: string;
    address: string;
  };
}

interface Billing {
  id: string;
  amount: number;
  due_date: string;
  payment_date?: string;
  status: string;
  description?: string;
}

const PortalLocatario: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'contratos' | 'boletos' | 'historico'
  >('contratos');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRent, setShowRent] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);

    const { data: tenantData } = await supabase
      .from('profiles')
      .select('cpf, phone')
      .eq('id', profile.id)
      .single();

    const cpf = tenantData?.cpf;
    if (!cpf) {
      setIsLoading(false);
      return;
    }

    const { data: contractData } = await supabase
      .from('rental_contracts')
      .select('*, property:property_id(title, address)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    const tenantContracts =
      contractData?.filter(
        (c) => c.tenant_cpf === cpf || c.tenant_email === profile.email
      ) || [];
    setContracts(tenantContracts);

    if (tenantContracts.length > 0) {
      const contractIds = tenantContracts.map((c) => c.id);
      const { data: billingData } = await supabase
        .from('billing')
        .select('*')
        .in('contract_id', contractIds)
        .order('due_date', { ascending: false });
      setBillings(billingData || []);
    }

    setIsLoading(false);
  }, [profile?.id, profile?.email]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const totalReceber = billings
    .filter((b) => b.status === 'aberto' || b.status === 'vencido')
    .reduce((s, b) => s + (b.amount || 0), 0);

  const totalRecebido = billings
    .filter((b) => b.status === 'pago')
    .reduce((s, b) => s + (b.amount || 0), 0);

  const proximoVencimento = billings
    .filter((b) => b.status === 'aberto')
    .sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    )[0];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return {
          label: 'Pago',
          color: 'bg-emerald-100 text-emerald-700',
          icon: CheckCircle,
        };
      case 'aberto':
        return {
          label: 'Aberto',
          color: 'bg-blue-100 text-blue-700',
          icon: Clock,
        };
      case 'vencido':
        return {
          label: 'Vencido',
          color: 'bg-red-100 text-red-700',
          icon: AlertTriangle,
        };
      default:
        return {
          label: status,
          color: 'bg-slate-100 text-slate-700',
          icon: Clock,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-blue-600 text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase italic">
              Portal do Locatário
            </h1>
            <p className="text-blue-100 text-sm">
              Olá, {profile?.full_name || 'Locatário'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-blue-100 hover:text-white"
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-6 space-y-6">
        {/* CardsResumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <DollarSign size={20} />
              </div>
              <span className="text-slate-500 text-sm">Próximo Vencimento</span>
            </div>
            <p className="text-2xl font-black text-slate-900">
              {proximoVencimento
                ? new Date(proximoVencimento.due_date).toLocaleDateString(
                    'pt-BR'
                  )
                : '—'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <CreditCard size={20} />
              </div>
              <span className="text-slate-500 text-sm">Total a Pagar</span>
            </div>
            <p className="text-2xl font-black text-slate-900">
              R$ {totalReceber.toLocaleString('pt-BR')}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle size={20} />
              </div>
              <span className="text-slate-500 text-sm">Total Pago (Ano)</span>
            </div>
            <p className="text-2xl font-black text-slate-900">
              R$ {totalRecebido.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200">
            {[
              { key: 'contratos', label: 'Meus Contratos', icon: Key },
              { key: 'boletos', label: 'Boletos', icon: FileText },
              { key: 'historico', label: 'Histórico', icon: Clock },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Aba Contratos */}
            {activeTab === 'contratos' && (
              <div className="space-y-4">
                {contracts.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">
                    Nenhum contrato encontrado.
                  </p>
                ) : (
                  contracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900">
                            {contract.property?.title || 'Imóvel'}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {contract.property?.address}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full ${
                            contract.payment_status === 'em_dia'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {contract.payment_status === 'em_dia'
                            ? 'Em dia'
                            : 'Atrasado'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-slate-400">Período</p>
                          <p className="font-medium">
                            {new Date(contract.start_date).toLocaleDateString(
                              'pt-BR'
                            )}{' '}
                            ↔{' '}
                            {new Date(contract.end_date).toLocaleDateString(
                              'pt-BR'
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Aluguel</p>
                          <p className="font-medium flex items-center gap-2">
                            R${' '}
                            {showRent
                              ? contract.monthly_rent?.toLocaleString('pt-BR')
                              : '***'}
                            <button
                              onClick={() => setShowRent(!showRent)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              {showRent ? (
                                <EyeOff size={14} />
                              ) : (
                                <Eye size={14} />
                              )}
                            </button>
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Índice</p>
                          <p className="font-medium">
                            {contract.adjustment_index}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Aba Boletos */}
            {activeTab === 'boletos' && (
              <div className="space-y-3">
                {billings.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">
                    Nenhum boleto encontrado.
                  </p>
                ) : (
                  billings
                    .filter((b) => b.status !== 'pago')
                    .map((boleto) => {
                      const badge = getStatusBadge(boleto.status);
                      return (
                        <div
                          key={boleto.id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              {boleto.description || 'Aluguel'}
                            </p>
                            <p className="text-sm text-slate-500">
                              Vencimento:{' '}
                              {new Date(boleto.due_date).toLocaleDateString(
                                'pt-BR'
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-slate-900">
                              R$ {boleto.amount?.toLocaleString('pt-BR')}
                            </p>
                            <span
                              className={`text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1 ${badge.color}`}
                            >
                              <badge.icon size={12} />
                              {badge.label}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            )}

            {/* Aba Histórico */}
            {activeTab === 'historico' && (
              <div className="space-y-3">
                {billings.filter((b) => b.status === 'pago').length === 0 ? (
                  <p className="text-center text-slate-400 py-8">
                    Nenhum pagamento registrado.
                  </p>
                ) : (
                  billings
                    .filter((b) => b.status === 'pago')
                    .map((boleto) => (
                      <div
                        key={boleto.id}
                        className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {boleto.description || 'Aluguel'}
                          </p>
                          <p className="text-sm text-slate-500">
                            Pago em:{' '}
                            {boleto.payment_date
                              ? new Date(
                                  boleto.payment_date
                                ).toLocaleDateString('pt-BR')
                              : '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-emerald-700">
                            R$ {boleto.amount?.toLocaleString('pt-BR')}
                          </p>
                          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                            <CheckCircle size={12} />
                            Pago
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ajuda */}
        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
          <h3 className="font-bold text-blue-900 mb-2">Precisa de ajuda?</h3>
          <p className="text-sm text-blue-700">
            Entre em contato com a imobiliária pelo WhatsApp ou email para
            dúvidas sobre seu contrato ou boletos.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortalLocatario;
