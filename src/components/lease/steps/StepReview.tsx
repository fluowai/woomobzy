import React from 'react';
import { CheckCircle, FileText, User, DollarSign, Calendar, ShieldCheck, Building2, Home, Lock, PenTool } from 'lucide-react';
import type { Lease } from '../../../types/lease';
import { LEASE_STATUS_LABELS, GUARANTEE_LABELS, ADJUSTMENT_INDICES_LABELS } from '../../../types/lease';

interface Props {
  lease: Partial<Lease>;
  updateField: <K extends keyof Lease>(key: K, value: Lease[K]) => void;
  updateFields: (fields: Partial<Lease>) => void;
}

const SectionCard: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
  <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Icon size={18} /></div>
      <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">{title}</h4>
    </div>
    {children}
  </section>
);

const Field: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-bold text-slate-700">{value || <span className="text-slate-300">Não informado</span>}</p>
  </div>
);

export const StepReview: React.FC<Props> = ({ lease }) => {
  const today = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Aviso de Ativação */}
      <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-emerald-800">Revisão Final</h3>
            <p className="text-sm text-emerald-600">
              Revise todos os dados antes de ativar o contrato. Após ativação, o contrato será gerado e os boletos poderão ser emitidos.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard icon={User} title="Locatário">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome" value={lease.tenant_name} />
            <Field label="CPF" value={lease.tenant_cpf} />
            <Field label="E-mail" value={lease.tenant_email} />
            <Field label="Telefone" value={lease.tenant_phone} />
            <Field label="Profissão" value={lease.tenant_profession} />
            <Field label="Renda" value={lease.tenant_monthly_income ? `R$ ${lease.tenant_monthly_income.toLocaleString('pt-BR')}` : undefined} />
          </div>
        </SectionCard>

        <SectionCard icon={Building2} title="Imóvel">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Imóvel" value={lease.property_title} />
            <Field label="Finalidade" value={lease.rental_purpose === 'residencial' ? 'Residencial' : 'Comercial'} />
            <Field label="Condomínio" value={lease.condominium_fee ? `R$ ${lease.condominium_fee.toLocaleString('pt-BR')}` : undefined} />
            <Field label="IPTU" value={lease.iptu_amount ? `R$ ${lease.iptu_amount.toLocaleString('pt-BR')}` : undefined} />
          </div>
        </SectionCard>

        <SectionCard icon={Home} title="Locador">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome" value={lease.owner_name} />
            <Field label="Comissão" value={lease.commission_percent ? `${lease.commission_percent}%` : undefined} />
          </div>
        </SectionCard>

        <SectionCard icon={Lock} title="Garantia">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo" value={lease.guarantee_type ? GUARANTEE_LABELS[lease.guarantee_type] : undefined} />
            <Field label="Valor" value={lease.guarantee_value ? `R$ ${lease.guarantee_value.toLocaleString('pt-BR')}` : undefined} />
            {lease.guarantee_type === 'fiador' && (
              <>
                <Field label="Fiador" value={lease.guarantor_name} />
                <Field label="CPF Fiador" value={lease.guarantor_cpf} />
              </>
            )}
          </div>
        </SectionCard>

        <SectionCard icon={DollarSign} title="Condições Comerciais">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Aluguel" value={lease.monthly_rent ? `R$ ${lease.monthly_rent.toLocaleString('pt-BR')}` : undefined} />
            <Field label="Vencimento" value={lease.due_day ? `Dia ${lease.due_day}` : undefined} />
            <Field label="Índice" value={lease.adjustment_index ? ADJUSTMENT_INDICES_LABELS[lease.adjustment_index] : undefined} />
            <Field label="Multa" value={lease.late_fee_percent ? `${lease.late_fee_percent}%` : undefined} />
          </div>
        </SectionCard>

        <SectionCard icon={Calendar} title="Período">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início" value={lease.start_date ? new Date(lease.start_date).toLocaleDateString('pt-BR') : undefined} />
            <Field label="Término" value={lease.end_date ? new Date(lease.end_date).toLocaleDateString('pt-BR') : undefined} />
            <Field label="Prazo" value={lease.contract_duration_months ? `${lease.contract_duration_months} meses` : undefined} />
          </div>
        </SectionCard>
      </div>

      {/* Testemunhas */}
      {(lease.witness_1_name || lease.witness_2_name) && (
        <SectionCard icon={PenTool} title="Testemunhas">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Testemunha 1" value={lease.witness_1_name} />
            <Field label="CPF" value={lease.witness_1_cpf} />
            <Field label="Testemunha 2" value={lease.witness_2_name} />
            <Field label="CPF" value={lease.witness_2_cpf} />
          </div>
        </SectionCard>
      )}

      {/* Data de Geração */}
      <div className="text-center text-xs text-slate-400">
        Contrato gerado em {today}
      </div>
    </div>
  );
};
