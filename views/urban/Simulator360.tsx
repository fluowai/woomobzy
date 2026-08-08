import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Info,
  ChevronDown,
  Check,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface BankCondition {
  id: string;
  name: string;
  logoInitial: string;
  color: string;
  taxa: number; // % a.a.
  cet: number; // % a.a.
}

const BANKS: BankCondition[] = [
  {
    id: 'caixa',
    name: 'Caixa Econômica',
    logoInitial: 'C',
    color: 'bg-emerald-100 text-emerald-700',
    taxa: 10.49,
    cet: 11.21,
  },
  {
    id: 'itau',
    name: 'Itaú',
    logoInitial: 'I',
    color: 'bg-orange-100 text-orange-700',
    taxa: 10.89,
    cet: 11.67,
  },
  {
    id: 'bradesco',
    name: 'Bradesco',
    logoInitial: 'B',
    color: 'bg-red-100 text-red-700',
    taxa: 11.12,
    cet: 11.94,
  },
];

export default function Simulator360() {
  const { profile } = useAuth();

  const [propertyPrice, setPropertyPrice] = useState<number>(450000);
  const [entryValue, setEntryValue] = useState<number>(90000);
  const [termYears, setTermYears] = useState<number>(30);
  const [amortization, setAmortization] = useState<'SAC' | 'PRICE'>('SAC');
  const [selectedBankId, setSelectedBankId] = useState<string>('caixa');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Calculate Entry Percentage
  const entryPercentage = useMemo(() => {
    if (propertyPrice === 0) return 0;
    return (entryValue / propertyPrice) * 100;
  }, [propertyPrice, entryValue]);

  const handleEntryPercentageChange = (pct: number) => {
    setEntryValue((pct / 100) * propertyPrice);
  };

  const financedAmount = propertyPrice - entryValue;
  const termMonths = termYears * 12;

  // Calculate Simulation for a specific bank
  const calculateSimulation = (bank: BankCondition, sys: 'SAC' | 'PRICE') => {
    const monthlyRate = Math.pow(1 + bank.taxa / 100, 1 / 12) - 1;
    let firstInstallment = 0;
    let lastInstallment = 0;
    let totalCost = 0;
    const chartData = [];

    if (sys === 'SAC') {
      const amortizationMonthly = financedAmount / termMonths;
      let currentBalance = financedAmount;

      for (let m = 1; m <= termMonths; m++) {
        const interest = currentBalance * monthlyRate;
        const installment = amortizationMonthly + interest;
        totalCost += installment;

        if (m === 1) firstInstallment = installment;
        if (m === termMonths) lastInstallment = installment;

        if (m === 1 || m % 60 === 0 || m === termMonths) {
          chartData.push({ month: m, value: installment });
        }

        currentBalance -= amortizationMonthly;
      }
    } else {
      // PRICE
      const installment =
        (financedAmount *
          (monthlyRate * Math.pow(1 + monthlyRate, termMonths))) /
        (Math.pow(1 + monthlyRate, termMonths) - 1);
      firstInstallment = installment;
      lastInstallment = installment;
      totalCost = installment * termMonths;

      chartData.push({ month: 1, value: installment });
      chartData.push({ month: termMonths, value: installment });
    }

    return {
      firstInstallment,
      lastInstallment,
      totalCost,
      chartData,
    };
  };

  const selectedBank = BANKS.find((b) => b.id === selectedBankId) || BANKS[0];
  const simResult = calculateSimulation(selectedBank, amortization);

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  const formatCompactCurrency = (val: number) =>
    val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });

  const saveSimulation = async (status: 'draft' | 'proposal' = 'draft') => {
    if (!profile?.organization_id) return;
    setSaving(true);
    setFeedback('');

    const { error } = await supabase
      .from('urban_financing_simulations')
      .insert({
        organization_id: profile.organization_id,
        created_by: profile.id,
        title: `Simulação de ${formatCurrency(propertyPrice)}`,
        property_price: propertyPrice,
        entry_value: entryValue,
        installments_count: termMonths,
        monthly_interest_rate: selectedBank.taxa / 12,
        monthly_installment: simResult.firstInstallment,
        total_financed: financedAmount,
        total_cost: simResult.totalCost,
        status,
      });

    setSaving(false);
    if (error) {
      setFeedback(`Erro: ${error.message}`);
    } else {
      setFeedback(
        status === 'proposal' ? 'Proposta registrada!' : 'Simulação salva!'
      );
      setTimeout(() => setFeedback(''), 3000);
    }
  };

  return (
    <div className="wootech-reference-screen w-full max-w-[1600px] mx-auto pb-12 font-sans text-slate-800 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Simulador de financiamento
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Compare condições e crie a melhor proposta para seu cliente
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span className="text-xs font-bold text-emerald-700">
            Taxas atualizadas hoje
          </span>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-center mb-10 max-w-2xl mx-auto w-full relative">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200 -z-10" />
        <div className="flex justify-between w-full">
          <div className="flex items-center gap-2 bg-[#f8fafc] px-2">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
              1
            </div>
            <span className="text-sm font-bold text-slate-900">
              Dados do imóvel
            </span>
          </div>
          <div className="flex items-center gap-2 bg-[#f8fafc] px-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">
              2
            </div>
            <span className="text-sm font-medium text-slate-500">
              Condições
            </span>
          </div>
          <div className="flex items-center gap-2 bg-[#f8fafc] px-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">
              3
            </div>
            <span className="text-sm font-medium text-slate-500">
              Comparar bancos
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Column */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Main Form */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Valor do imóvel
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    value={propertyPrice}
                    onChange={(e) => setPropertyPrice(Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Entrada
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    value={entryValue}
                    onChange={(e) => setEntryValue(Number(e.target.value))}
                    className="w-full pl-12 pr-16 py-3 bg-white border border-slate-200 rounded-lg text-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    ({Math.round(entryPercentage)}%)
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-400">0%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={entryPercentage}
                    onChange={(e) =>
                      handleEntryPercentageChange(Number(e.target.value))
                    }
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <span className="text-xs font-medium text-slate-400">
                    100%
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Prazo
                </label>
                <div className="relative">
                  <select
                    value={termYears}
                    onChange={(e) => setTermYears(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 appearance-none focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value={10}>10 anos</option>
                    <option value={20}>20 anos</option>
                    <option value={30}>30 anos</option>
                    <option value={35}>35 anos</option>
                  </select>
                  <ChevronDown
                    size={18}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Sistema de amortização
                </label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setAmortization('SAC')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${amortization === 'SAC' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    SAC
                  </button>
                  <button
                    onClick={() => setAmortization('PRICE')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${amortization === 'PRICE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    PRICE
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Banks Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-8">
            <h3 className="text-base font-bold text-slate-900 mb-6">
              Melhores condições encontradas
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 text-xs font-medium text-slate-400">
                      Banco
                    </th>
                    <th className="pb-3 text-xs font-medium text-slate-400">
                      Taxa a.a.
                    </th>
                    <th className="pb-3 text-xs font-medium text-slate-400">
                      Parcela inicial
                    </th>
                    <th className="pb-3 text-xs font-medium text-slate-400">
                      CET
                    </th>
                    <th className="pb-3 text-xs font-medium text-slate-400">
                      Total
                    </th>
                    <th className="pb-3 text-xs font-medium text-slate-400">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {BANKS.map((bank, index) => {
                    const sim = calculateSimulation(bank, amortization);
                    const isSelected = selectedBankId === bank.id;
                    const isBest = index === 0; // Fake best logic

                    return (
                      <tr
                        key={bank.id}
                        className={`transition-colors cursor-pointer hover:bg-slate-50/50 ${isSelected ? 'bg-emerald-50/30' : ''}`}
                        onClick={() => setSelectedBankId(bank.id)}
                      >
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-emerald-600 bg-white' : 'border-slate-300'}`}
                            >
                              {isSelected && (
                                <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />
                              )}
                            </div>
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${bank.color}`}
                            >
                              {bank.logoInitial}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {bank.name}
                              </p>
                              {isBest && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  Melhor opção
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <p className="text-sm font-medium text-slate-700">
                            {bank.taxa.toFixed(2).replace('.', ',')}%
                          </p>
                        </td>
                        <td className="py-4">
                          <p className="text-sm font-bold text-slate-900">
                            {formatCurrency(sim.firstInstallment)}
                          </p>
                        </td>
                        <td className="py-4">
                          <p className="text-sm font-medium text-slate-700">
                            {bank.cet.toFixed(2).replace('.', ',')}%
                          </p>
                        </td>
                        <td className="py-4">
                          <p className="text-sm font-medium text-slate-700">
                            {formatCompactCurrency(sim.totalCost)}
                          </p>
                        </td>
                        <td className="py-4">
                          <ChevronRight size={18} className="text-slate-400" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-slate-400 mt-6 flex items-center gap-1.5">
              Condições válidas para perfil padrão. Sujeitas à análise de
              crédito.
            </p>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-96 space-y-6 shrink-0">
          <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-8">
            <h3 className="text-base font-bold text-slate-900 mb-6">
              Resumo da simulação
            </h3>

            <div className="flex items-center gap-3 mb-6">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${selectedBank.color}`}
              >
                {selectedBank.logoInitial}
              </div>
              <p className="text-sm font-medium text-slate-700">
                {selectedBank.name} • {amortization}
              </p>
            </div>

            <div className="mb-8">
              <p className="text-xs font-medium text-slate-500 mb-1">
                Primeira parcela
              </p>
              <p className="text-[2.5rem] font-bold text-emerald-600 leading-none tracking-tight">
                {formatCurrency(simResult.firstInstallment)}
              </p>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Entrada</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(entryValue)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Valor financiado</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(financedAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Última parcela</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(simResult.lastInstallment)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-3">
                <span className="font-medium text-slate-700">Custo total</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(simResult.totalCost)}
                </span>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="text-xs font-medium text-slate-500 mb-4">
                Evolução das parcelas ({amortization})
              </h4>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={simResult.chartData}>
                    <defs>
                      <linearGradient
                        id="colorValue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#059669"
                          stopOpacity={0.1}
                        />
                        <stop
                          offset="95%"
                          stopColor="#059669"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <YAxis hide={true} domain={['auto', 'auto']} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Mês ${label}`}
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#059669"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium">
                <span>Hoje</span>
                <span>{termYears} anos</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => saveSimulation('proposal')}
                disabled={saving}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition-all shadow-sm"
              >
                Gerar proposta
              </button>
              <button
                onClick={() => saveSimulation('draft')}
                disabled={saving}
                className="w-full py-3.5 bg-white border border-slate-200 text-emerald-700 hover:bg-slate-50 font-bold text-sm rounded-lg transition-all shadow-sm"
              >
                Salvar no CRM
              </button>

              {feedback && (
                <p className="text-center text-xs font-bold text-emerald-600 mt-2">
                  {feedback}
                </p>
              )}
            </div>

            <p className="text-[10px] text-center text-slate-400 mt-4 flex items-center justify-center gap-1">
              Simulação indicativa • Consulte condições do banco{' '}
              <Info size={12} />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
