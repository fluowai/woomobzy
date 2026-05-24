import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BriefcaseBusiness,
  Calendar,
  DollarSign,
  FileText,
  Home,
  Key,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useEnvironment } from '../../context/EnvironmentContext';

interface Contract {
  id: string;
  tenant_name: string;
  tenant_email?: string;
  tenant_phone?: string;
  tenant_cpf?: string;
  evaluation_score?: number;
  evaluation_status?: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  adjustment_index: string;
  payment_status: string;
  status: string;
}

const inputClass =
  'w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300';

const paymentLabels: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  em_dia: { label: 'Em Dia', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  atrasado: { label: 'Atrasado', color: 'text-amber-700', bg: 'bg-amber-100' },
  inadimplente: {
    label: 'Inadimplente',
    color: 'text-red-700',
    bg: 'bg-red-100',
  },
};

const emptyForm = {
  tenant_name: '',
  tenant_email: '',
  tenant_phone: '',
  tenant_cpf: '',
  tenant_rg: '',
  tenant_birth_date: '',
  tenant_marital_status: '',
  tenant_profession: '',
  tenant_employer: '',
  tenant_monthly_income: 0,
  tenant_address: '',
  tenant_city: '',
  tenant_state: '',
  tenant_zip: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  reference_1_name: '',
  reference_1_phone: '',
  reference_2_name: '',
  reference_2_phone: '',
  evaluation_score: 70,
  evaluation_status: 'em_analise',
  credit_score: 0,
  has_restrictions: false,
  restriction_notes: '',
  income_proof_status: 'pendente',
  guarantor_name: '',
  guarantor_cpf: '',
  guarantor_phone: '',
  guarantor_monthly_income: 0,
  guarantee_type: 'sem',
  guarantee_document: '',
  recommended_limit: 0,
  analysis_notes: '',
  observation: '',
  start_date: '',
  end_date: '',
  monthly_rent: 0,
  adjustment_index: 'IGPM',
  payment_status: 'em_dia',
};

type FormState = typeof emptyForm;

const Field: React.FC<{
  label: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, className = '', children }) => (
  <div className={className}>
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
      {label}
    </label>
    {children}
  </div>
);

const SectionTitle: React.FC<{
  icon: React.ElementType;
  title: string;
}> = ({ icon: Icon, title }) => (
  <div className="mb-4 flex items-center gap-2">
    <Icon size={18} className="text-blue-600" />
    <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">
      {title}
    </h4>
  </div>
);

const Locacao: React.FC = () => {
  const { profile } = useAuth();
  const { activeEnvironmentId } = useEnvironment();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    load();
  }, []);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const load = async () => {
    const { data } = await supabase
      .from('rental_contracts')
      .select('*')
      .eq('organization_id', profile?.organization_id)
      .eq('environment_id', activeEnvironmentId)
      .order('created_at', { ascending: false });
    setContracts(data || []);
  };

  const handleSave = async () => {
    if (!form.tenant_name) return;

    const { error } = await supabase.from('rental_contracts').insert({
      ...form,
      organization_id: profile?.organization_id,
      environment_id: activeEnvironmentId,
      status: 'active',
    });

    if (error) {
      console.error('Erro ao salvar contrato:', error);
      return;
    }

    setShowModal(false);
    setForm(emptyForm);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este contrato?')) return;
    const { error } = await supabase
      .from('rental_contracts')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile?.organization_id)
      .eq('environment_id', activeEnvironmentId);
    if (error) {
      console.error('Erro ao excluir contrato:', error);
      return;
    }
    load();
  };

  const totalRent = contracts
    .filter((contract) => contract.status === 'active')
    .reduce((total, contract) => total + (contract.monthly_rent || 0), 0);
  const inadimplentes = contracts.filter(
    (contract) => contract.payment_status === 'inadimplente'
  ).length;
  const atrasados = contracts.filter(
    (contract) => contract.payment_status === 'atrasado'
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter flex items-center gap-3">
            <Key className="text-blue-600" size={32} />
            Locacao & Administracao
          </h1>
          <p className="text-black/60 font-medium">
            Contratos ativos, reajustes automaticos, inadimplencia e boletos.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all shadow-lg"
        >
          <Plus size={18} /> Novo Contrato
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            icon: Key,
            label: 'Contratos Ativos',
            value: String(
              contracts.filter((contract) => contract.status === 'active').length
            ),
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            icon: DollarSign,
            label: 'Receita Mensal',
            value: `R$ ${totalRent.toLocaleString('pt-BR')}`,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            icon: AlertTriangle,
            label: 'Inadimplentes',
            value: String(inadimplentes),
            color: 'text-red-600',
            bg: 'bg-red-50',
          },
          {
            icon: Calendar,
            label: 'Reajustes Pendentes',
            value: String(atrasados),
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"
          >
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4`}>
              <stat.icon size={24} />
            </div>
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
              {stat.label}
            </h3>
            <p className="text-3xl font-black text-slate-900 italic tracking-tighter">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Locatario
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Avaliacao
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Periodo
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Aluguel
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Pagamento
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Key className="mx-auto mb-3 text-slate-300" size={40} />
                    <p className="font-medium">Nenhum contrato de locacao</p>
                  </td>
                </tr>
              ) : (
                contracts.map((contract) => {
                  const pay =
                    paymentLabels[contract.payment_status] || paymentLabels.em_dia;
                  return (
                    <tr
                      key={contract.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-all"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-black">
                          {contract.tenant_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {contract.tenant_email || contract.tenant_phone || 'Sem contato'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                            <span
                              className="block h-full rounded-full bg-blue-600"
                              style={{ width: `${contract.evaluation_score || 0}%` }}
                            />
                          </span>
                          <span className="text-xs font-black text-slate-600">
                            {contract.evaluation_score || 0}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">
                          {contract.evaluation_status || 'sem avaliacao'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {contract.start_date
                          ? new Date(contract.start_date).toLocaleDateString('pt-BR')
                          : '-'}{' '}
                        ate{' '}
                        {contract.end_date
                          ? new Date(contract.end_date).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-600">
                        R$ {contract.monthly_rent?.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${pay.bg} ${pay.color}`}
                        >
                          {pay.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDelete(contract.id)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-6">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-8">
              <div>
                <h3 className="text-xl font-black text-black">
                  Novo Contrato de Locacao
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Cadastro completo para avaliacao cadastral, financeira e risco do locatario.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-8">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
                <div className="space-y-5">
                  <section className="rounded-2xl border border-slate-200 p-4">
                    <SectionTitle icon={UserCheck} title="Identificacao" />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <Field className="md:col-span-2" label="Nome completo">
                        <input value={form.tenant_name} onChange={(event) => updateForm('tenant_name', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="CPF/CNPJ">
                        <input value={form.tenant_cpf} onChange={(event) => updateForm('tenant_cpf', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="RG">
                        <input value={form.tenant_rg} onChange={(event) => updateForm('tenant_rg', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Nascimento">
                        <input type="date" value={form.tenant_birth_date} onChange={(event) => updateForm('tenant_birth_date', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Estado civil">
                        <select value={form.tenant_marital_status} onChange={(event) => updateForm('tenant_marital_status', event.target.value)} className={inputClass}>
                          <option value="">Selecione</option>
                          <option value="solteiro">Solteiro(a)</option>
                          <option value="casado">Casado(a)</option>
                          <option value="uniao_estavel">Uniao estavel</option>
                          <option value="divorciado">Divorciado(a)</option>
                          <option value="viuvo">Viuvo(a)</option>
                        </select>
                      </Field>
                      <Field label="Email">
                        <input type="email" value={form.tenant_email} onChange={(event) => updateForm('tenant_email', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Telefone">
                        <input value={form.tenant_phone} onChange={(event) => updateForm('tenant_phone', event.target.value)} className={inputClass} />
                      </Field>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 p-4">
                    <SectionTitle icon={BriefcaseBusiness} title="Renda e Trabalho" />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <Field label="Profissao">
                        <input value={form.tenant_profession} onChange={(event) => updateForm('tenant_profession', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Empresa">
                        <input value={form.tenant_employer} onChange={(event) => updateForm('tenant_employer', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Renda mensal">
                        <input type="number" value={form.tenant_monthly_income} onChange={(event) => updateForm('tenant_monthly_income', Number(event.target.value))} className={inputClass} />
                      </Field>
                      <Field label="Comprovante">
                        <select value={form.income_proof_status} onChange={(event) => updateForm('income_proof_status', event.target.value)} className={inputClass}>
                          <option value="pendente">Pendente</option>
                          <option value="recebido">Recebido</option>
                          <option value="validado">Validado</option>
                          <option value="reprovado">Reprovado</option>
                        </select>
                      </Field>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 p-4">
                    <SectionTitle icon={Home} title="Endereco e Referencias" />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                      <Field className="md:col-span-3" label="Endereco atual">
                        <input value={form.tenant_address} onChange={(event) => updateForm('tenant_address', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Cidade">
                        <input value={form.tenant_city} onChange={(event) => updateForm('tenant_city', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="UF">
                        <input value={form.tenant_state} onChange={(event) => updateForm('tenant_state', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="CEP">
                        <input value={form.tenant_zip} onChange={(event) => updateForm('tenant_zip', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Contato emergencia">
                        <input value={form.emergency_contact_name} onChange={(event) => updateForm('emergency_contact_name', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Tel. emergencia">
                        <input value={form.emergency_contact_phone} onChange={(event) => updateForm('emergency_contact_phone', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Referencia 1">
                        <input value={form.reference_1_name} onChange={(event) => updateForm('reference_1_name', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Telefone ref. 1">
                        <input value={form.reference_1_phone} onChange={(event) => updateForm('reference_1_phone', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Referencia 2">
                        <input value={form.reference_2_name} onChange={(event) => updateForm('reference_2_name', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Telefone ref. 2">
                        <input value={form.reference_2_phone} onChange={(event) => updateForm('reference_2_phone', event.target.value)} className={inputClass} />
                      </Field>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 p-4">
                    <SectionTitle icon={FileText} title="Contrato" />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <Field label="Inicio">
                        <input type="date" value={form.start_date} onChange={(event) => updateForm('start_date', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Termino">
                        <input type="date" value={form.end_date} onChange={(event) => updateForm('end_date', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Aluguel (R$)">
                        <input type="number" value={form.monthly_rent} onChange={(event) => updateForm('monthly_rent', Number(event.target.value))} className={inputClass} />
                      </Field>
                      <Field label="Indice">
                        <select value={form.adjustment_index} onChange={(event) => updateForm('adjustment_index', event.target.value)} className={inputClass}>
                          <option value="IGPM">IGPM</option>
                          <option value="IPCA">IPCA</option>
                          <option value="INCC">INCC</option>
                          <option value="ICV">ICV</option>
                          <option value="POUPANCA">Poupanca</option>
                        </select>
                      </Field>
                    </div>
                  </section>
                </div>

                <aside className="space-y-5">
                  <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <SectionTitle icon={ShieldCheck} title="Avaliacao" />
                    <Field label="Status">
                      <select value={form.evaluation_status} onChange={(event) => updateForm('evaluation_status', event.target.value)} className={`${inputClass} bg-white`}>
                        <option value="em_analise">Em analise</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="aprovado_com_ressalva">Aprovado com ressalva</option>
                        <option value="reprovado">Reprovado</option>
                      </select>
                    </Field>
                    <Field label={`Score interno: ${form.evaluation_score}`}>
                      <input type="range" min="0" max="100" value={form.evaluation_score} onChange={(event) => updateForm('evaluation_score', Number(event.target.value))} className="w-full accent-blue-600" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Score credito">
                        <input type="number" value={form.credit_score} onChange={(event) => updateForm('credit_score', Number(event.target.value))} className={`${inputClass} bg-white`} />
                      </Field>
                      <Field label="Limite sugerido">
                        <input type="number" value={form.recommended_limit} onChange={(event) => updateForm('recommended_limit', Number(event.target.value))} className={`${inputClass} bg-white`} />
                      </Field>
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-700">
                      <input type="checkbox" checked={form.has_restrictions} onChange={(event) => updateForm('has_restrictions', event.target.checked)} />
                      Possui restricoes cadastrais
                    </label>
                    <textarea value={form.restriction_notes} onChange={(event) => updateForm('restriction_notes', event.target.value)} placeholder="Detalhe restricoes, pendencias ou observacoes de risco." className="mt-3 min-h-20 w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm outline-none" />
                  </section>

                  <section className="rounded-2xl border border-slate-200 p-4">
                    <h4 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-800">
                      Garantia / Fiador
                    </h4>
                    <div className="space-y-3">
                      <Field label="Tipo de garantia">
                        <select value={form.guarantee_type} onChange={(event) => updateForm('guarantee_type', event.target.value)} className={inputClass}>
                          <option value="sem">Sem garantia</option>
                          <option value="fiador">Fiador</option>
                          <option value="seguro">Seguro fianca</option>
                          <option value="deposito">Deposito caucao</option>
                          <option value="titulo_capitalizacao">Titulo de capitalizacao</option>
                        </select>
                      </Field>
                      <Field label="Nome do fiador">
                        <input value={form.guarantor_name} onChange={(event) => updateForm('guarantor_name', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="CPF do fiador">
                        <input value={form.guarantor_cpf} onChange={(event) => updateForm('guarantor_cpf', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Telefone do fiador">
                        <input value={form.guarantor_phone} onChange={(event) => updateForm('guarantor_phone', event.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Renda do fiador">
                        <input type="number" value={form.guarantor_monthly_income} onChange={(event) => updateForm('guarantor_monthly_income', Number(event.target.value))} className={inputClass} />
                      </Field>
                    </div>
                  </section>
                </aside>
              </div>

              <section className="mt-5 rounded-2xl border border-slate-200 p-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Observacoes finais da avaliacao
                </label>
                <textarea value={form.analysis_notes} onChange={(event) => updateForm('analysis_notes', event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
              </section>
            </div>

            <button
              onClick={handleSave}
              className="mx-5 mb-5 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all shadow-lg sm:mx-8 sm:mb-8"
            >
              Salvar Contrato e Avaliacao
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Locacao;
