import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import {
  FileText,
  Plus,
  FileSignature,
  DollarSign,
  Calendar,
  Search,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { supabase } from '@/services/supabase';
import { logger } from '@/utils/logger';

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
    fetchData();
  }, [fetchData]);

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
          <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs font-medium">
            Ativo
          </span>
        );
      case 'draft':
        return (
          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
            Rascunho
          </span>
        );
      case 'pending_signatures':
        return (
          <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-medium">
            Aguardando Assinatura
          </span>
        );
      default:
        return (
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestão de Aluguéis
          </h1>
          <p className="text-gray-500">
            Controle completo de contratos, faturas e repasses (
            {settings.agencyName})
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <button
            onClick={() => toast.info('Borderô / Repasses em breve!')}
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-md px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <DollarSign className="w-4 h-4" />
            Borderô / Repasses
          </button>
          <button
            onClick={() => toast.info('Novo Contrato em breve!')}
            className="flex items-center gap-2 rounded-md px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Contrato
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Receita Prevista</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.receita_mensal)}
              </p>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Inadimplência</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(stats.valor_inadimplencia)}
              </p>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Contratos Ativos</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats.ativos}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Aguardando Assinatura</p>
              <p className="text-xl font-bold text-amber-600">
                {stats.pending_signatures}
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <FileSignature className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-semibold">Contratos de Locação</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por inquilino ou ref..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Inquilino</th>
                <th className="px-4 py-3 font-medium">Ref / Imóvel</th>
                <th className="px-4 py-3 font-medium">Valor (Mês)</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Carregando contratos...
                  </td>
                </tr>
              ) : leases.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>Nenhum contrato encontrado</p>
                  </td>
                </tr>
              ) : (
                leases.map((lease) => (
                  <tr
                    key={lease.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-750/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {lease.tenant_name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {lease.contract_number || 'S/N'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">
                      {formatCurrency(lease.monthly_rent)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {lease.end_date
                          ? new Date(lease.end_date).toLocaleDateString('pt-BR')
                          : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(lease.status)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          toast.info('Gerenciamento de contrato em breve!')
                        }
                        className="text-sm font-medium rounded-md px-3 py-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                      >
                        Gerenciar
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
