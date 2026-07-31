import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { FileDown, Search, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { supabase } from '@/services/supabase';
import { logger } from '@/utils/logger';

export default function RentalsBordero() {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchActiveLeases();
  }, []);

  const fetchActiveLeases = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch('/api/locacao/leases?status=active', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLeases(data.data);
      }
    } catch (error) {
      logger.error('Erro ao buscar locações ativas:', error);
    }
  };

  const generateBordero = async (leaseId: string) => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(
        `/api/locacao/bordero?lease_id=${leaseId}&year=${selectedYear}&month=${selectedMonth}`,
        {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        }
      );
      const data = await res.json();
      if (data.success) {
        alert(`Borderô Gerado: Repasse de R$ ${data.data.total_to_repass}`);
        // Aqui conectaria com uma lib para gerar PDF real (ex: jsPDF ou React-pdf)
      } else {
        alert('Nenhuma fatura paga encontrada para este período');
      }
    } catch (error) {
      logger.error('Erro ao gerar bordero:', error);
      alert('Erro ao gerar borderô');
    } finally {
      setLoading(false);
    }
  };

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Borderôs e Repasses
        </h1>
        <p className="text-gray-500">
          Geração de folhas de repasse (Split) para os proprietários
        </p>
      </div>

      <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mês de Referência
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ano
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
        </div>
        <div className="flex-none">
          <button
            onClick={() => toast.info('Filtragem em breve')}
            className="w-full md:w-auto px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Filtrar
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Contratos Elegíveis para Repasse
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 font-medium">Contrato / Inquilino</th>
                <th className="px-4 py-3 font-medium">Split Asaas?</th>
                <th className="px-4 py-3 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {leases.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Nenhum contrato ativo encontrado.
                  </td>
                </tr>
              ) : (
                leases.map((lease) => (
                  <tr
                    key={lease.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-750/50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {lease.tenant_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Ref: {lease.contract_number}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                          Split Configurado
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => generateBordero(lease.id)}
                        disabled={loading}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-2 ml-auto"
                      >
                        <FileDown className="w-4 h-4" />
                        Gerar Extrato
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
