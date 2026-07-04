import React, { useState, useEffect } from 'react';
import {
  Calculator, 
  DollarSign, 
  Calendar, 
  Percent, 
  ArrowRight, 
  Download, 
  Printer,
  FileText,
  Trash2,
  PlusCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface BalloonPayment {
  id: string;
  month: number;
  amount: number;
}

const Simulator360: React.FC = () => {
  const { profile } = useAuth();
  const [propertyPrice, setPropertyPrice] = useState(250000);
  const [entryValue, setEntryValue] = useState(25000);
  const [installmentsCount, setInstallmentsCount] = useState(120);
  const [interestRate, setInterestRate] = useState(0.8); // % ao mês
  const [balloons, setBalloons] = useState<BalloonPayment[]>([]);
  const [totalFinanced, setTotalFinanced] = useState(0);
  const [monthlyInstallment, setMonthlyInstallment] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const calculateFinancing = () => {
    const principal = Math.max(propertyPrice - entryValue, 0);
    const totalBalloons = balloons.reduce((acc, b) => acc + b.amount, 0);
    const financeablePrincipal = Math.max(principal - totalBalloons, 0);
    
    // Fórmula Price: P = [i * (1 + i)^n] / [(1 + i)^n - 1] * principal
    const i = interestRate / 100;
    const n = Math.max(installmentsCount, 1);
    
    let monthly;
    if (i === 0) {
      monthly = financeablePrincipal / n;
    } else {
      monthly = financeablePrincipal * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    }
    
    setTotalFinanced(principal);
    setMonthlyInstallment(monthly);
    setTotalCost(entryValue + (monthly * n) + totalBalloons);
  };

  useEffect(() => {
    calculateFinancing();
  }, [propertyPrice, entryValue, installmentsCount, interestRate, balloons]);

  const addBalloon = () => {
    const newBalloon = {
      id: Math.random().toString(36).substr(2, 9),
      month: 12,
      amount: 5000
    };
    setBalloons([...balloons, newBalloon]);
  };

  const removeBalloon = (id: string) => {
    setBalloons(balloons.filter(b => b.id !== id));
  };

  const updateBalloon = (id: string, field: 'month' | 'amount', value: number) => {
    setBalloons(balloons.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const formatCurrency = (val: number) => 
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const validateSimulation = () => {
    if (propertyPrice <= 0) return 'Informe um valor de imovel valido.';
    if (entryValue < 0 || entryValue > propertyPrice) {
      return 'A entrada deve ficar entre zero e o valor do imovel.';
    }
    if (installmentsCount < 1) return 'Informe ao menos uma parcela.';
    if (interestRate < 0) return 'A taxa de juros nao pode ser negativa.';
    if (
      balloons.some(
        (item) =>
          item.month < 1 ||
          item.month > installmentsCount ||
          item.amount < 0
      )
    ) {
      return 'Revise os meses e valores dos baloes.';
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
      setFeedback('Organizacao nao identificada.');
      return false;
    }

    setSaving(true);
    setFeedback('');
    const { error } = await supabase.from('urban_financing_simulations').insert({
      organization_id: profile.organization_id,
      created_by: profile.id,
      title: `Simulacao de ${formatCurrency(propertyPrice)}`,
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
      setFeedback(`Nao foi possivel salvar: ${error.message}`);
      return false;
    }
    setFeedback(
      status === 'proposal'
        ? 'Proposta registrada no CRM.'
        : 'Simulacao salva no CRM.'
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
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 uppercase italic tracking-tighter leading-none mb-3">
            Simulador <span className="text-blue-600">Financeiro 360°</span>
          </h1>
          <p className="text-slate-500 font-medium italic">
            Cálculos avançados de parcelamento, balões e projeção de juros.
          </p>
        </div>
        
        <div className="flex gap-2">
           <button onClick={printProposal} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/10">
              <Printer size={16} /> Imprimir PDF
           </button>
           <button onClick={generateProposal} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20">
              <FileText size={16} /> Gerar Proposta
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Painel de Entrada de Dados */}
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 lg:p-12 space-y-10">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
               <label className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-2">Valor do Imóvel / Lote</label>
               <div className="relative">
                 <DollarSign size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-600" />
                 <input 
                   type="number"
                   value={propertyPrice}
                   onChange={(e) => setPropertyPrice(Number(e.target.value))}
                   className="w-full pl-16 pr-8 py-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-xl text-slate-900"
                 />
               </div>
            </div>
            <div className="space-y-4">
               <label className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-2">Valor da Entrada (Sinal)</label>
               <div className="relative">
                 <DollarSign size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500" />
                 <input 
                   type="number"
                   value={entryValue}
                   onChange={(e) => setEntryValue(Number(e.target.value))}
                   className="w-full pl-16 pr-8 py-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-xl text-slate-900"
                 />
               </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
               <label className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-2">Prazo (Meses)</label>
               <div className="relative">
                 <Calendar size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-600" />
                 <input 
                   type="number"
                   value={installmentsCount}
                   onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                   className="w-full pl-16 pr-8 py-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-xl text-slate-900"
                 />
               </div>
            </div>
            <div className="space-y-4">
               <label className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-2">Taxa de Juros (% ao mês)</label>
               <div className="relative">
                 <Percent size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-amber-500" />
                 <input 
                   type="number"
                   step="0.01"
                   value={interestRate}
                   onChange={(e) => setInterestRate(Number(e.target.value))}
                   className="w-full pl-16 pr-8 py-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-xl text-slate-900"
                 />
               </div>
            </div>
          </section>

          {/* Seção de Balões */}
          <section className="space-y-6">
             <div className="flex items-center justify-between border-b border-slate-100 pb-4">
               <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                 <RefreshCw size={16} className="text-blue-600" /> Balões / Reforços
               </h3>
               <button 
                onClick={addBalloon}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-2 uppercase tracking-widest"
               >
                 <PlusCircle size={16} /> Adicionar Balão
               </button>
             </div>
             
             {balloons.length === 0 ? (
               <div className="py-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-sm font-bold text-slate-400 italic">Nenhum balão programado. Adicione reforços anuais ou semestrais.</p>
               </div>
             ) : (
               <div className="space-y-3">
                 {balloons.map((b) => (
                   <div key={b.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 group">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                         <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Mês:</span>
                            <input 
                              type="number"
                              value={b.month}
                              onChange={(e) => updateBalloon(b.id, 'month', Number(e.target.value))}
                              className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold"
                            />
                         </div>
                         <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Valor:</span>
                            <input 
                              type="number"
                              value={b.amount}
                              onChange={(e) => updateBalloon(b.id, 'amount', Number(e.target.value))}
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold"
                            />
                         </div>
                      </div>
                      <button 
                        onClick={() => removeBalloon(b.id)}
                        className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                   </div>
                 ))}
               </div>
             )}
          </section>
        </div>

        {/* Painel de Resultados (Sticky) */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 text-white rounded-[2.5rem] shadow-2xl p-10 space-y-10 sticky top-10">
             <div className="space-y-1">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Parcela Mensal Estimada</h3>
                <p className="text-5xl font-bold italic tracking-tighter leading-tight">
                   {formatCurrency(monthlyInstallment)}
                </p>
             </div>

             <div className="space-y-6 border-t border-white/10 pt-8">
                <div className="flex justify-between items-center">
                   <span className="text-xs font-bold text-white/40 uppercase">Total Financiado</span>
                   <span className="text-lg font-bold text-white">{formatCurrency(totalFinanced)}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-xs font-bold text-white/40 uppercase">Total de Balões</span>
                   <span className="text-lg font-bold text-amber-400">
                     {formatCurrency(balloons.reduce((acc, b) => acc + b.amount, 0))}
                   </span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-xs font-bold text-white/40 uppercase">Total de Juros</span>
                   <span className="text-lg font-bold text-red-400">
                      {formatCurrency(totalCost - propertyPrice)}
                   </span>
                </div>
                
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mt-6">
                   <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">VGV Total da Negociação</p>
                   <p className="text-3xl font-bold text-emerald-400 italic tracking-tighter">
                     {formatCurrency(totalCost)}
                   </p>
                </div>
             </div>

             <section className="space-y-4">
                <div className="flex items-center gap-3 text-white/60">
                   <TrendingUp size={18} className="text-blue-400" />
                   <p className="text-xs font-medium">Correção sugerida: <strong>IPCA + 0,5%</strong></p>
                </div>
                <div className="flex items-center gap-3 text-white/60">
                   <Calculator size={18} className="text-emerald-400" />
                   <p className="text-xs font-medium">Tabela: <strong>PRICE (Amortização Constante)</strong></p>
                </div>
             </section>
             
             {feedback && (
               <p className="rounded-xl bg-white/10 px-4 py-3 text-xs font-bold text-white/80">
                 {feedback}
               </p>
             )}
             <button onClick={() => saveSimulation('draft')} disabled={saving} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all">
                Salvar Simulação no CRM
             </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Simulator360;
