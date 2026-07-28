import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import {
  FileText,
  Plus,
  FileSignature,
  DollarSign,
  Calendar,
  Search,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { supabase } from '@/services/supabase';
import { logger } from '@/utils/logger';
import { RentalsContractEditor } from './RentalsContractEditor';

interface Lease {
  id: string;
  tenant_name: string;
  contract_number: string;
  status: string;
  signature_status: string;
  monthly_rent: number;
  start_date: string;
  end_date: string;
}

interface DashboardStats {
  receita_mensal: number;
  valor_inadimplencia: number;
  ativos: number;
  pending_signatures: number;
}

export function RentalsManagement() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    receita_mensal: 0,
    valor_inadimplencia: 0,
    ativos: 0,
    pending_signatures: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session?.access_token}` };

      const [leasesRes, dashboardRes] = await Promise.all([
        fetch('/api/locacao/leases', { headers }),
        fetch('/api/locacao/dashboard/resumo', { headers }),
      ]);

      const leasesData = await leasesRes.json();
      if (leasesData.success) {
        setLeases(leasesData.data);
      }

      const dashData = await dashboardRes.json();
      if (dashData.success) {
        const allLeases = leasesData.data || [];
        const pendingSigs = allLeases.filter(
          (l: Lease) =>
            l.signature_status === 'pending_signatures' ||
            l.status === 'pending_signatures'
        ).length;

        setStats({
          receita_mensal: dashData.data.receita_mensal || 0,
          valor_inadimplencia: dashData.data.valor_inadimplencia || 0,
          ativos: dashData.data.ativos || 0,
          pending_signatures: pendingSigs,
        });
      }
    } catch (error) {
      logger.error('Erro ao buscar dados de locações:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isCreatingContract) {
      fetchData();
    }
  }, [fetchData, isCreatingContract]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Ativo
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
            Rascunho
          </span>
        );
      case 'pending_signatures':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Aguard. Assinatura
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20">
            {status}
          </span>
        );
    }
  };

  if (isCreatingContract) {
    return <RentalsContractEditor onClose={() => setIsCreatingContract(false)} />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight">
            Gestão de Aluguéis
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Controle de contratos, faturas e repasses da {settings.agencyName}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={() => toast.info('Borderô / Repasses em breve!')}
            className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-gray-300 transition-all shadow-sm"
          >
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Borderôs
          </button>
          <button
            onClick={() => setIsCreatingContract(true)}
            className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Novo Contrato
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-16 h-16 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Receita Prevista
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(stats.receita_mensal)}
          </p>
          <div className="mt-4 flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 w-fit px-2 py-1 rounded-md">
            + Mensal
          </div>
        </div>

        <div className="relative overflow-hidden bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertCircle className="w-16 h-16 text-rose-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Inadimplência
          </p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-500">
            {formatCurrency(stats.valor_inadimplencia)}
          </p>
          <div className="mt-4 flex items-center text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 w-fit px-2 py-1 rounded-md">
            Atrasados
          </div>
        </div>

        <div className="relative overflow-hidden bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <FileText className="w-16 h-16 text-indigo-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Contratos Ativos
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.ativos}
          </p>
          <div className="mt-4 flex items-center text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 w-fit px-2 py-1 rounded-md">
            Vigentes
          </div>
        </div>

        <div className="relative overflow-hidden bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <FileSignature className="w-16 h-16 text-amber-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Aguardando Assinatura
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.pending_signatures}
          </p>
          <div className="mt-4 flex items-center text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 w-fit px-2 py-1 rounded-md">
            Pendentes
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Lista de Contratos
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por inquilino, imóvel..."
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
            <thead className="bg-gray-50/80 dark:bg-gray-900/80 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Inquilino</th>
                <th className="px-6 py-4 font-semibold">Ref / Imóvel</th>
                <th className="px-6 py-4 font-semibold">Valor (Mês)</th>
                <th className="px-6 py-4 font-semibold">Vencimento</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <p>Carregando contratos...</p>
                    </div>
                  </td>
                </tr>
              ) : leases.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-700">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-base font-medium text-gray-900 dark:text-white mb-1">
                        Nenhum contrato encontrado
                      </p>
                      <p className="text-sm">
                        Crie um novo contrato para começar a gerenciar locações.
                      </p>
                      <button
                        onClick={() => setIsCreatingContract(true)}
                        className="mt-4 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                      >
                        Criar Primeiro Contrato
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                leases.map((lease) => (
                  <tr
                    key={lease.id}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-750/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {lease.tenant_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {lease.contract_number || 'S/N'}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-200">
                      {formatCurrency(lease.monthly_rent)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {lease.end_date
                          ? new Date(lease.end_date).toLocaleDateString('pt-BR')
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(lease.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() =>
                          toast.info('Gerenciamento de contrato em breve!')
                        }
                        className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                      >
                        Detalhes
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
