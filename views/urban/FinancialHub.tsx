import React, { useState, useEffect, useCallback } from 'react';
import { Landmark,
  Shield,
  Calculator,
  ChevronRight,
  Zap,
  CheckCircle,
  Clock,
  ArrowRight,
  Building2,
  User,
  DollarSign,
  Percent,
  Calendar,
  FileText,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Loader2,
  Star,
  BadgeCheck,
  RefreshCw,
  Lock,
  Printer,
  Trash2,
  PlusCircle,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { logger } from '@/utils/logger';

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────
type ActiveTab = 'credito' | 'direto' | 'fianca';

interface CreditSimulation {
  propertyValue: number;
  entryPercent: number;
  termYears: number;
  modality: 'sac' | 'price';
}

interface CreditResult {
  entryValue: number;
  financedAmount: number;
  firstInstallment: number;
  lastInstallment: number;
  totalCost: number;
  effectiveCost: number; // CET ao ano
}

interface FiancaForm {
  tenantName: string;
  tenantCpf: string;
  tenantIncome: number;
  rentValue: number;
  condoFee: number;
  iptuMonthly: number;
  propertyType: 'residential' | 'commercial';
}

interface FiancaRequest {
  id: string;
  tenant_name: string;
  rent_value: number;
  status: 'pending' | 'approved' | 'rejected' | 'analysis';
  created_at: string;
  multiplier?: number;
}

// ──────────────────────────────────────────────────────────────
// PARTNER BANKS CONFIG
// ──────────────────────────────────────────────────────────────
const BANKS = [
  {
    id: 'caixa',
    name: 'Caixa Econômica',
    rate: 0.584,
    logo: '🏛️',
    color: 'bg-blue-600',
  },
  { id: 'itau', name: 'Itaú', rate: 0.625, logo: '🏦', color: 'bg-orange-500' },
  {
    id: 'bradesco',
    name: 'Bradesco',
    rate: 0.641,
    logo: '🏦',
    color: 'bg-red-600',
  },
  {
    id: 'santander',
    name: 'Santander',
    rate: 0.677,
    logo: '🏦',
    color: 'bg-red-700',
  },
  {
    id: 'bb',
    name: 'Banco do Brasil',
    rate: 0.598,
    logo: '🏦',
    color: 'bg-yellow-600',
  },
];

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const calculateSAC = (
  principal: number,
  rateMonthly: number,
  months: number
): CreditResult => {
  const amort = principal / months;
  const firstInstallment = amort + principal * rateMonthly;
  const lastInstallment = amort + amort * rateMonthly;
  const totalInterest = ((principal + amort) / 2) * rateMonthly * months;
  const totalCost = principal + totalInterest;
  const cet = Math.pow(totalCost / principal, 12 / months) - 1;
  return {
    entryValue: 0,
    financedAmount: principal,
    firstInstallment,
    lastInstallment,
    totalCost,
    effectiveCost: cet * 100,
  };
};

const calculatePRICE = (
  principal: number,
  rateMonthly: number,
  months: number
): CreditResult => {
  const i = rateMonthly;
  const pmt =
    (principal * i * Math.pow(1 + i, months)) / (Math.pow(1 + i, months) - 1);
  const totalCost = pmt * months;
  const cet = Math.pow(totalCost / principal, 12 / months) - 1;
  return {
    entryValue: 0,
    financedAmount: principal,
    firstInstallment: pmt,
    lastInstallment: pmt,
    totalCost,
    effectiveCost: cet * 100,
  };
};

// ──────────────────────────────────────────────────────────────
// SUB-COMPONENT: Credit Simulator
// ──────────────────────────────────────────────────────────────
const CreditSimulator: React.FC<{ orgId: string }> = ({ orgId }) => {
  const [form, setForm] = useState<CreditSimulation>({
    propertyValue: 450000,
    entryPercent: 20,
    termYears: 30,
    modality: 'sac',
  });
  const [selectedBank, setSelectedBank] = useState(BANKS[0]);
  const [result, setResult] = useState<CreditResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const compute = useCallback(() => {
    const entry = form.propertyValue * (form.entryPercent / 100);
    const principal = form.propertyValue - entry;
    const rateMonthly = selectedBank.rate / 100;
    const months = form.termYears * 12;
    const res =
      form.modality === 'sac'
        ? calculateSAC(principal, rateMonthly, months)
        : calculatePRICE(principal, rateMonthly, months);
    res.entryValue = entry;
    setResult(res);
  }, [form, selectedBank]);

  useEffect(() => {
    compute();
  }, [compute]);

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await (supabase as any).from('urban_financing_simulations').insert({
        organization_id: orgId,
        title: `Simulação ${selectedBank.name} - ${fmt(form.propertyValue)}`,
        property_price: form.propertyValue,
        entry_value: result.entryValue,
        installments_count: form.termYears * 12,
        monthly_interest_rate: selectedBank.rate / 100,
        monthly_installment: result.firstInstallment,
        total_financed: result.financedAmount,
        total_cost: result.totalCost,
        status: 'draft',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      logger.error('Erro ao salvar simulação:', err);
    }
    setSaving(false);
  };

  const f = (field: keyof CreditSimulation, val: string | number) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* LEFT: Form */}
      <div className="xl:col-span-7 space-y-6">
        {/* Dados do imóvel */}
        <div className="card-premium p-6 space-y-5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-widest">
            <Building2 size={16} className="text-primary" /> Dados do Imóvel
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                Valor do Imóvel
              </span>
              <div className="relative mt-1">
                <DollarSign
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-primary"
                />
                <input
                  type="number"
                  value={form.propertyValue}
                  onChange={(e) => f('propertyValue', Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                Entrada (%)
              </span>
              <div className="relative mt-1">
                <Percent
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500"
                />
                <input
                  type="number"
                  min={5}
                  max={80}
                  step={1}
                  value={form.entryPercent}
                  onChange={(e) => f('entryPercent', Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 ml-1">
                Valor da entrada:{' '}
                {fmt(form.propertyValue * (form.entryPercent / 100))}
              </p>
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                Prazo (Anos)
              </span>
              <div className="relative mt-1">
                <Calendar
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500"
                />
                <input
                  type="number"
                  min={5}
                  max={35}
                  value={form.termYears}
                  onChange={(e) => f('termYears', Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                Modalidade
              </span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(['sac', 'price'] as const).map((mod) => (
                  <button
                    key={mod}
                    onClick={() => f('modality', mod)}
                    className={`py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${
                      form.modality === mod
                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-primary/40'
                    }`}
                  >
                    {mod.toUpperCase()}
                  </button>
                ))}
              </div>
            </label>
          </div>
        </div>

        {/* Bank Selection */}
        <div className="card-premium p-6 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-widest">
            <Landmark size={16} className="text-primary" /> Selecione o Banco
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BANKS.map((bank) => (
              <button
                key={bank.id}
                onClick={() => setSelectedBank(bank)}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left group ${
                  selectedBank.id === bank.id
                    ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                    : 'border-slate-100 hover:border-primary/30 bg-white'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl ${bank.color} flex items-center justify-center text-white text-lg shrink-0`}
                >
                  {bank.logo}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {bank.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    {bank.rate}% a.m.
                  </p>
                </div>
                {selectedBank.id === bank.id && (
                  <CheckCircle
                    size={16}
                    className="text-primary ml-auto shrink-0"
                  />
                )}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-1">
            <Lock size={11} /> Taxas indicativas. Integração com APIs bancárias
            em breve.
          </p>
        </div>
      </div>

      {/* RIGHT: Results */}
      <div className="xl:col-span-5 space-y-4">
        {result && (
          <div className="card-premium bg-slate-900 text-white rounded-3xl p-7 space-y-6 sticky top-6">
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                {selectedBank.name} · {form.modality.toUpperCase()}
              </p>
              <p className="text-slate-400 text-xs mt-1">
                {form.termYears} anos · {form.termYears * 12} parcelas
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {form.modality === 'sac' ? '1ª Parcela' : 'Parcela Mensal'}
              </p>
              <p className="text-4xl font-bold tracking-tight text-white">
                {fmt(result.firstInstallment)}
              </p>
              {form.modality === 'sac' && (
                <p className="text-xs text-white/50">
                  Última parcela: {fmt(result.lastInstallment)}
                </p>
              )}
            </div>

            <div className="space-y-3 border-t border-white/10 pt-5">
              {[
                {
                  label: 'Entrada',
                  value: fmt(result.entryValue),
                  color: 'text-emerald-400',
                },
                {
                  label: 'Valor Financiado',
                  value: fmt(result.financedAmount),
                  color: 'text-white',
                },
                {
                  label: 'Custo Total',
                  value: fmt(result.totalCost),
                  color: 'text-amber-400',
                },
                {
                  label: 'CET Anual',
                  value: `${(result.effectiveCost * 12).toFixed(2)}%`,
                  color: 'text-red-400',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between items-center"
                >
                  <span className="text-xs text-white/40 font-bold uppercase">
                    {item.label}
                  </span>
                  <span className={`text-sm font-bold ${item.color}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/30 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FileText size={14} />
                )}
                {saved ? 'Salvo no CRM ✓' : 'Salvar no CRM'}
              </button>
              <button
                onClick={() => window.print()}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all"
              >
                Imprimir / PDF
              </button>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 space-y-2">
              <p className="text-[10px] font-bold text-white/40 uppercase">
                Em breve
              </p>
              {['CrediHome', 'MelhorTaxa', 'Open Finance'].map((partner) => (
                <div
                  key={partner}
                  className="flex items-center gap-2 text-xs text-white/50"
                >
                  <ExternalLink size={11} />
                  <span>Integração com {partner}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
// SUB-COMPONENT: Fiança Digital
// ──────────────────────────────────────────────────────────────
const FiancaDigital: React.FC<{ orgId: string; userId: string }> = ({
  orgId,
  userId,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FiancaForm>({
    tenantName: '',
    tenantCpf: '',
    tenantIncome: 0,
    rentValue: 0,
    condoFee: 0,
    iptuMonthly: 0,
    propertyType: 'residential',
  });
  const [requests, setRequests] = useState<FiancaRequest[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoadingList(true);
      const { data } = await (supabase as any)
        .from('fianca_requests')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(20);
      setRequests((data as FiancaRequest[]) || []);
      setLoadingList(false);
    };
    fetchRequests();
  }, [orgId]);

  const totalEncargo = form.rentValue + form.condoFee + form.iptuMonthly;
  const incomeOk = form.tenantIncome >= totalEncargo * 3;
  const multiplier =
    form.tenantIncome > 0 ? (form.tenantIncome / totalEncargo).toFixed(1) : '0';

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data } = await (supabase as any)
        .from('fianca_requests')
        .insert({
          organization_id: orgId,
          created_by: userId,
          tenant_name: form.tenantName,
          tenant_cpf: form.tenantCpf.replace(/\D/g, ''),
          tenant_income: form.tenantIncome,
          rent_value: form.rentValue,
          condo_fee: form.condoFee,
          iptu_monthly: form.iptuMonthly,
          property_type: form.propertyType,
          total_encargo: totalEncargo,
          income_multiplier: parseFloat(multiplier),
          status: 'analysis',
        })
        .select()
        .single();
      if (data) {
        setRequests((prev) => [data as FiancaRequest, ...prev]);
        setStep(3);
      }
    } catch (err) {
      logger.error('Erro ao enviar solicitação de fiança:', err);
    }
    setSubmitting(false);
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
    analysis: { label: 'Em Análise', color: 'bg-blue-100 text-blue-700' },
    approved: { label: 'Aprovado', color: 'bg-green-100 text-green-700' },
    rejected: { label: 'Reprovado', color: 'bg-red-100 text-red-700' },
  };

  return (
    <div className="space-y-6">
      {/* Partners banner */}
      <div className="card-premium p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-1">
              Fiança Aluguel Digital
            </p>
            <h3 className="text-lg font-bold">
              Garantia locatícia 100% digital
            </h3>
            <p className="text-sm text-white/60 mt-1">
              Análise de crédito rápida. Sem fiador, sem caução.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {['CredPago', 'Porto Seguro', 'Tokio Marine'].map((p) => (
              <span
                key={p}
                className="px-3 py-1.5 bg-white/10 rounded-xl text-xs font-bold text-white/70 border border-white/10"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Form */}
        <div className="xl:col-span-7">
          {step === 3 ? (
            <div className="card-premium p-12 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle size={40} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Solicitação enviada!
              </h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                A análise de crédito está em andamento. Você receberá o
                resultado em breve.
              </p>
              <button
                onClick={() => {
                  setStep(1);
                  setForm({
                    tenantName: '',
                    tenantCpf: '',
                    tenantIncome: 0,
                    rentValue: 0,
                    condoFee: 0,
                    iptuMonthly: 0,
                    propertyType: 'residential',
                  });
                }}
                className="btn btn-primary mt-4"
              >
                Nova Solicitação
              </button>
            </div>
          ) : (
            <div className="card-premium p-6 space-y-6">
              {/* Step indicator */}
              <div className="flex items-center gap-3 mb-2">
                {[1, 2].map((s) => (
                  <React.Fragment key={s}>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${step >= s ? 'bg-primary border-primary text-white' : 'border-slate-200 text-slate-400'}`}
                    >
                      {step > s ? <CheckCircle size={14} /> : s}
                    </div>
                    {s < 2 && (
                      <div
                        className={`flex-1 h-0.5 rounded transition-all ${step > s ? 'bg-primary' : 'bg-slate-100'}`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <User size={16} className="text-primary" /> Dados do
                    Inquilino
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                        Nome Completo
                      </span>
                      <input
                        className="mt-1 w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={form.tenantName}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, tenantName: e.target.value }))
                        }
                        placeholder="João da Silva"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                        CPF
                      </span>
                      <input
                        className="mt-1 w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={form.tenantCpf}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, tenantCpf: e.target.value }))
                        }
                        placeholder="000.000.000-00"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                        Renda Mensal Comprovável (R$)
                      </span>
                      <div className="relative mt-1">
                        <DollarSign
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500"
                        />
                        <input
                          type="number"
                          className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={form.tenantIncome || ''}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              tenantIncome: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </label>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    disabled={
                      !form.tenantName || !form.tenantCpf || !form.tenantIncome
                    }
                    className="btn btn-primary w-full disabled:opacity-50"
                  >
                    Continuar <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Building2 size={16} className="text-primary" /> Dados do
                    Imóvel
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                        Tipo
                      </span>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {(['residential', 'commercial'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() =>
                              setForm((p) => ({ ...p, propertyType: t }))
                            }
                            className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${form.propertyType === t ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                          >
                            {t === 'residential' ? 'Residencial' : 'Comercial'}
                          </button>
                        ))}
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                        Aluguel (R$)
                      </span>
                      <div className="relative mt-1">
                        <DollarSign
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-primary"
                        />
                        <input
                          type="number"
                          className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={form.rentValue || ''}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              rentValue: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                        Condomínio (R$)
                      </span>
                      <div className="relative mt-1">
                        <DollarSign
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="number"
                          className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={form.condoFee || ''}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              condoFee: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                        IPTU Mensal (R$)
                      </span>
                      <div className="relative mt-1">
                        <DollarSign
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="number"
                          className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={form.iptuMonthly || ''}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              iptuMonthly: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </label>
                  </div>
                  <div
                    className={`rounded-2xl p-4 border ${incomeOk ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}
                  >
                    <div className="flex items-center gap-2">
                      {incomeOk ? (
                        <CheckCircle size={16} className="text-green-600" />
                      ) : (
                        <AlertCircle size={16} className="text-amber-600" />
                      )}
                      <p
                        className={`text-xs font-bold ${incomeOk ? 'text-green-700' : 'text-amber-700'}`}
                      >
                        Comprometimento: {multiplier}x o encargo total de{' '}
                        {fmt(totalEncargo)}
                      </p>
                    </div>
                    <p
                      className={`text-xs mt-1 ml-6 ${incomeOk ? 'text-green-600' : 'text-amber-600'}`}
                    >
                      {incomeOk
                        ? 'Renda adequada para aprovação.'
                        : 'Renda pode ser insuficiente (mínimo recomendado: 3x).'}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="btn bg-slate-100 text-slate-700 flex-1"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !form.rentValue}
                      className="btn btn-primary flex-1 disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Zap size={14} />
                      )}
                      Solicitar Análise
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Requests list */}
        <div className="xl:col-span-5">
          <div className="card-premium p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock size={15} className="text-primary" /> Solicitações
                Recentes
              </h3>
              <button
                onClick={() => {
                  setLoadingList(true);
                  (supabase as any)
                    .from('fianca_requests')
                    .select('*')
                    .eq('organization_id', orgId)
                    .order('created_at', { ascending: false })
                    .limit(20)
                    .then(({ data }: { data: FiancaRequest[] | null }) => {
                      setRequests((data as FiancaRequest[]) || []);
                      setLoadingList(false);
                    });
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {loadingList ? (
              <div className="py-8 text-center">
                <Loader2
                  size={24}
                  className="animate-spin text-primary mx-auto"
                />
              </div>
            ) : requests.length === 0 ? (
              <div className="py-10 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                <Shield size={32} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">
                  Nenhuma solicitação ainda.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                {requests.map((req) => {
                  const st = statusConfig[req.status] || {
                    label: req.status,
                    color: 'bg-slate-100 text-slate-600',
                  };
                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 truncate">
                            {req.tenant_name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {fmt(req.rent_value)}/mês
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 ${st.color}`}
                        >
                          {st.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2">
                        {new Date(req.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// ──────────────────────────────────────────────────────────────
// SUB-COMPONENT: Financiamento Direto (Simulator360)
// ──────────────────────────────────────────────────────────────
interface BalloonPayment {
  id: string;
  month: number;
  amount: number;
}

const DiretoSimulator: React.FC = () => {
  const { profile } = useAuth();
  const [propertyPrice, setPropertyPrice] = useState(250000);
  const [entryValue, setEntryValue] = useState(25000);
  const [installmentsCount, setInstallmentsCount] = useState(120);
  const [interestRate, setInterestRate] = useState(0.8);
  const [balloons, setBalloons] = useState<BalloonPayment[]>([]);
  const [totalFinanced, setTotalFinanced] = useState(0);
  const [monthlyInstallment, setMonthlyInstallment] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const calculateFinancing = useCallback(() => {
    const principal = Math.max(propertyPrice - entryValue, 0);
    const totalBalloons = balloons.reduce((acc, b) => acc + b.amount, 0);
    const financeablePrincipal = Math.max(principal - totalBalloons, 0);

    const i = interestRate / 100;
    const n = Math.max(installmentsCount, 1);

    let monthly;
    if (i === 0) {
      monthly = financeablePrincipal / n;
    } else {
      monthly =
        (financeablePrincipal * (i * Math.pow(1 + i, n))) /
        (Math.pow(1 + i, n) - 1);
    }

    setTotalFinanced(principal);
    setMonthlyInstallment(monthly);
    setTotalCost(entryValue + monthly * n + totalBalloons);
  }, [propertyPrice, entryValue, installmentsCount, interestRate, balloons]);

  useEffect(() => {
    calculateFinancing();
  }, [calculateFinancing]);

  const addBalloon = () => {
    const newBalloon = {
      id: Math.random().toString(36).substr(2, 9),
      month: 12,
      amount: 5000,
    };
    setBalloons([...balloons, newBalloon]);
  };

  const removeBalloon = (id: string) => {
    setBalloons(balloons.filter((b) => b.id !== id));
  };

  const updateBalloon = (
    id: string,
    field: 'month' | 'amount',
    value: number
  ) => {
    setBalloons(
      balloons.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const validateSimulation = () => {
    if (propertyPrice <= 0) return 'Informe um valor de imóvel válido.';
    if (entryValue < 0 || entryValue > propertyPrice) return 'A entrada deve ficar entre zero e o valor do imóvel.';
    if (installmentsCount < 1) return 'Informe ao menos uma parcela.';
    if (interestRate < 0) return 'A taxa de juros não pode ser negativa.';
    if (
      balloons.some(
        (item) =>
          item.month < 1 || item.month > installmentsCount || item.amount < 0
      )
    ) {
      return 'Revise os meses e valores dos balões.';
    }
    return '';
  };

  const saveSimulation = async (status: 'draft' | 'proposal' = 'draft') => {
    const validationMessage = validateSimulation();
    if (validationMessage) {
      setFeedback(validationMessage);
      return false;
    }
    if (!profile?.organization_id) {
      setFeedback('Organização não identificada.');
      return false;
    }

    setSaving(true);
    setFeedback('');
    const { error } = await (supabase as any)
      .from('urban_financing_simulations')
      .insert({
        organization_id: profile.organization_id,
        created_by: profile.id,
        title: `Simulação de ${formatCurrency(propertyPrice)}`,
        property_price: propertyPrice,
        entry_value: entryValue,
        installments_count: installmentsCount,
        monthly_interest_rate: interestRate,
        balloon_payments: balloons,
        monthly_installment: monthlyInstallment,
        total_financed: totalFinanced,
        total_cost: totalCost,
        status,
      });
    setSaving(false);

    if (error) {
      setFeedback(`Não foi possível salvar: ${error.message}`);
      return false;
    }
    setFeedback(
      status === 'proposal'
        ? 'Proposta registrada no CRM.'
        : 'Simulação salva no CRM.'
    );
    return true;
  };

  const printProposal = () => {
    const validationMessage = validateSimulation();
    if (validationMessage) {
      setFeedback(validationMessage);
      return;
    }
    window.print();
  };

  const generateProposal = async () => {
    const saved = await saveSimulation('proposal');
    if (saved) window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 uppercase italic tracking-tighter leading-none mb-1">
             <span className="text-blue-600">Financiamento Direto</span>
          </h3>
          <p className="text-slate-500 font-medium italic text-sm">
            Cálculos avançados de parcelamento, balões e projeção de juros (Loteamentos/Incorporadoras).
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={printProposal}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all"
          >
            <Printer size={14} /> Imprimir PDF
          </button>
          <button
            onClick={generateProposal}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            <FileText size={14} /> Gerar Proposta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em]">
                Valor do Imóvel / Lote
              </label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" />
                <input
                  type="number"
                  value={propertyPrice}
                  onChange={(e) => setPropertyPrice(Number(e.target.value))}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-900"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em]">
                Valor da Entrada
              </label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                <input
                  type="number"
                  value={entryValue}
                  onChange={(e) => setEntryValue(Number(e.target.value))}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-900"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em]">
                Prazo (Meses)
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" />
                <input
                  type="number"
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-900"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em]">
                Taxa de Juros (% a.m.)
              </label>
              <div className="relative">
                <Percent size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" />
                <input
                  type="number"
                  step="0.01"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <RefreshCw size={14} className="text-blue-600" /> Balões / Reforços
              </h3>
              <button
                onClick={addBalloon}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-widest"
              >
                <PlusCircle size={14} /> Adicionar
              </button>
            </div>
            {balloons.length === 0 ? (
              <div className="py-6 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-400 italic">
                  Nenhum balão programado.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {balloons.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Mês:</span>
                        <input
                          type="number"
                          value={b.month}
                          onChange={(e) => updateBalloon(b.id, 'month', Number(e.target.value))}
                          className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold outline-none focus:border-blue-300"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Valor:</span>
                        <input
                          type="number"
                          value={b.amount}
                          onChange={(e) => updateBalloon(b.id, 'amount', Number(e.target.value))}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold outline-none focus:border-blue-300"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeBalloon(b.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white rounded-3xl p-8 space-y-8 sticky top-10">
            <div className="space-y-1">
              <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                Parcela Mensal Estimada
              </h3>
              <p className="text-4xl font-bold tracking-tighter text-white">
                {formatCurrency(monthlyInstallment)}
              </p>
            </div>

            <div className="space-y-4 border-t border-white/10 pt-6">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white/40 uppercase">Total Financiado</span>
                <span className="text-sm font-bold text-white">{formatCurrency(totalFinanced)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white/40 uppercase">Total de Balões</span>
                <span className="text-sm font-bold text-amber-400">
                  {formatCurrency(balloons.reduce((acc, b) => acc + b.amount, 0))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white/40 uppercase">Total de Juros</span>
                <span className="text-sm font-bold text-red-400">
                  {formatCurrency(totalCost - propertyPrice)}
                </span>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl mt-4 border border-white/10">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                  VGV Total
                </p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(totalCost)}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
               <div className="flex items-center gap-2 text-white/60">
                <TrendingUp size={14} className="text-blue-400" />
                <p className="text-xs font-medium">Correção sugerida: <strong>IPCA + 0,5%</strong></p>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <Calculator size={14} className="text-emerald-400" />
                <p className="text-xs font-medium">Tabela: <strong>PRICE</strong></p>
              </div>
            </div>

            {feedback && (
              <p className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white/80 text-center">
                {feedback}
              </p>
            )}
            <button
              onClick={() => saveSimulation('draft')}
              disabled={saving}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
            >
              Salvar no CRM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================

// ─
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────
const FinancialHub: React.FC = () => {
  const { profile } = useAuth();
  const [tab, setTab] = useState<ActiveTab>('credito');

  const tabs = [
    {
      id: 'credito' as ActiveTab,
      label: 'Crédito Imobiliário',
      icon: Landmark,
      desc: 'Simule financiamentos',
    },
    
    {
      id: 'direto' as ActiveTab,
      label: 'Parcelamento Direto',
      icon: Calculator,
      desc: 'Simule parcelamento com loteadora/incorporadora',
    },
    {
      id: 'fianca' as ActiveTab,
      label: 'Fiança Aluguel',
      icon: Shield,
      desc: 'Garantia locatícia digital',
    },
  ];

  const orgId = profile?.organization_id || '';
  const userId = profile?.id || '';

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="h1 flex items-center gap-3 text-slate-900">
            <Landmark className="text-primary" size={30} />
            Financial Hub
          </h1>
          <p className="body mt-1 text-slate-500">
            Serviços financeiros integrados ao seu CRM imobiliário.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl">
          <TrendingUp size={15} className="text-amber-600" />
          <p className="text-xs font-bold text-amber-700">
            Integrações bancárias em fase beta
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border-2 transition-all text-left ${
              tab === t.id
                ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                : 'border-slate-100 bg-white text-slate-600 hover:border-primary/30'
            }`}
          >
            <t.icon size={18} />
            <div>
              <p className="text-xs font-bold">{t.label}</p>
              <p
                className={`text-[10px] ${tab === t.id ? 'text-white/70' : 'text-slate-400'}`}
              >
                {t.desc}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'credito' && <CreditSimulator orgId={orgId} />}
      {tab === 'fianca' && <FiancaDigital orgId={orgId} userId={userId} />}
      {tab === 'direto' && <DiretoSimulator />}
    </div>
  );
};

export default FinancialHub;
